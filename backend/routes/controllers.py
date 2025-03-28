import os
import io
from flask import Flask, redirect , send_file, Response,session,send_from_directory
from flask import render_template
from flask import request,url_for,flash
from flask import current_app as app
from models.models import *
from models.models import db
from sqlalchemy import *
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
from werkzeug.utils import secure_filename
from datetime import datetime
from flask import jsonify
from sqlalchemy import func
from sqlalchemy import or_
from flask_bcrypt import Bcrypt
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
from celery import Celery
from celery.schedules import crontab
import requests
from flask_mail import Mail, Message
import csv
from io import StringIO
from flask_caching import Cache
from models import caching
from flasgger import Swagger


bcrypt = Bcrypt(app)  # Ensure bcrypt is initialized
jwt = JWTManager(app) # Ensure JWT is initialized
cache=Cache(app)  # Ensure JWT is initialized

app.config['broker_url'] = 'redis://localhost:6379/0'
app.config['result_backend'] = 'redis://localhost:6379/0'
app.config['MAIL_SERVER'] = 'smtp.gmail.com'
app.config['MAIL_PORT'] = 587
app.config['MAIL_USE_TLS'] = True
app.config['MAIL_USERNAME'] = 'codninja2.0@gmail.com'
app.config['MAIL_PASSWORD'] = 'nqbf uxim kuja ihzs'
app.config['MAIL_DEFAULT_SENDER'] = 'antonyjalappat@gmail.com'


def make_celery(app):
    celery = Celery(
        app.import_name,
        backend=app.config['result_backend'],
        broker=app.config['broker_url']
    )
    celery.conf.update(app.config)
    class ContextTask(celery.Task):
        def __call__(self, *args, **kwargs):
            with app.app_context():
                return super().__call__(*args, **kwargs)
    celery.Task = ContextTask
    return celery

mail = Mail(app)
celery = make_celery(app)

ALLOWED_EXTENSIONS = {'pdf', 'docx', 'jpg', 'png'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


celery.conf.timezone = 'UTC'


# ------------------------------------------------Daily remainder for professionals------------------------------------------------

@celery.task(name="tasks.send_reminder_email")
def send_reminder_email(service_id):
    """Send an immediate reminder email to ALL professionals when a service request is created."""
    
    # Find professionals who match this service type
    service = Service.query.get(service_id)
    if not service:
        return "Service not found"

    professionals = Professional.query.filter_by(specialization=service.professional_type, status="Approved").all()

    if not professionals:
        return "No professionals found for this service"

    for professional in professionals:
        user = User.query.get(professional.id)
        if not user:
            continue

        subject = "New Service Request Available"
        body = f"""
        Dear {user.full_name},

        A new service request for "{service.name}" is available in your specialization.
        Please visit the platform to accept or reject it.

        Regards,
        Household Services Team
        """

        try:
            msg = Message(subject, recipients=[user.email], body=body)
            mail.send(msg)
            print(f"Reminder email sent to {user.full_name}")
        except Exception as e:
            print(f"Error sending email to {user.full_name}: {e}")

    return f"Reminder emails sent to {len(professionals)} professionals"

@celery.task(name="tasks.send_daily_reminders")
def send_daily_reminders():
    """Send scheduled email reminders to ALL professionals with pending service requests at 6 PM."""
    
    # Get all pending service requests
    pending_requests = ServiceRequest.query.filter_by(status='Pending').all()
    
    if not pending_requests:
        return "No pending service requests found."

    service_ids = {req.service_id for req in pending_requests}  # Get unique service IDs

    for service_id in service_ids:
        send_reminder_email.delay(service_id)  # Queue emails for all professionals

    return f"Scheduled reminders sent for {len(service_ids)} services!"



# celery.conf.beat_schedule = {
#     'send-daily-reminders': {
#         'task': 'tasks.send_daily_reminders',
#         'schedule': crontab(hour=12, minute=30),  # Runs daily at 6 PM UTC
#     }
# }


# ------------------------------------------------monthly activity report------------------------------------------------

@celery.task(name="tasks.send_monthly_activity_report")
def send_monthly_activity_report():
    """Generate and send a monthly activity report to each customer."""
    
    customers = User.query.filter_by(user_type="Customer").all()

    if not customers:
        return "No customers found for the monthly report."

    for customer in customers:
        report = generate_customer_report(customer.id)  # Generate report data
        html_content = render_report_as_html(report)  # Convert to HTML

        try:
            # Send the email with the report
            msg = Message(
                subject=f"Monthly Activity Report - {datetime.now().strftime('%B')}",
                recipients=[customer.email],
                html=html_content
            )
            mail.send(msg)
            print(f"Monthly report sent to {customer.full_name} ({customer.email})")
        except Exception as e:
            print(f"Error sending email to {customer.full_name}: {e}")

    return "Monthly activity reports sent successfully!"


def generate_customer_report(customer_id):
    """Fetch detailed service usage details for a customer."""
    
    customer = User.query.get(customer_id)
    if not customer:
        return {"error": "Customer not found"}

    # Fetch total services and total spending
    report_data = (
        db.session.query(
            func.count(ServiceRequest.id).label("services_used"),  
            func.sum(Service.base_price).label("total_spent")
        )
        .join(Service, Service.id == ServiceRequest.service_id)
        .filter(ServiceRequest.customer_id == customer_id)
        .filter(ServiceRequest.status == "Completed")  
        .one()
    )

    service_requests = ServiceRequest.query.filter_by(customer_id=customer_id).all()

    service_history = [
        {
            "service_name": req.service.name if req.service else "Unknown",
            "booking_date": req.booking_date.strftime('%Y-%m-%d'),
            "booking_time": req.booking_time.strftime('%H:%M'),
            "status": req.status,
            "rating": req.rating if req.rating else "N/A",
            "review": req.review if req.review else "No review",
            "price": req.service.base_price if req.service else 0
        }
        for req in service_requests
    ]

    return {
        "customer_name": customer.full_name,
        "email": customer.email,
        "services_used": report_data.services_used or 0,
        "total_spent": report_data.total_spent or 0.0,
        "address": customer.address,
        "date_range": "Last Month",
        "service_history": service_history
    }



def render_report_as_html(report):
    """Generate HTML email content for the detailed monthly activity report."""

    # Generate detailed service history rows
    service_history_html = ""
    for service in report['service_history']:
        service_history_html += f"""
        <tr>
            <td>{service['service_name']}</td>
            <td>{service['booking_date']}</td>
            <td>{service['booking_time']}</td>
            <td>{service['status']}</td>
            <td>{service['rating'] if service['rating'] else 'N/A'}</td>
            <td>{service['review'] if service['review'] else 'No review'}</td>
            <td>${service['price']}</td>
        </tr>
        """

    html_content = f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Customer Monthly Report</title>
        <style>
            body {{
                font-family: Arial, sans-serif;
                margin: 20px;
                line-height: 1.6;
                background-color: #f4f4f4;
            }}
            .report-container {{
                background: #fff;
                border: 1px solid #ddd;
                border-radius: 8px;
                padding: 20px;
                max-width: 800px;
                margin: auto;
                box-shadow: 0px 0px 10px rgba(0,0,0,0.1);
            }}
            h1 {{
                text-align: center;
                color: #333;
            }}
            .report-item {{
                margin-bottom: 10px;
                font-size: 16px;
            }}
            .report-item span {{
                font-weight: bold;
            }}
            table {{
                width: 100%;
                border-collapse: collapse;
                margin-top: 20px;
            }}
            th, td {{
                border: 1px solid #ddd;
                padding: 8px;
                text-align: left;
            }}
            th {{
                background-color: #f4f4f4;
            }}
        </style>
    </head>
    <body>
        <div class="report-container">
            <h1>Monthly Activity Report</h1>
            <div class="report-item">
                <span>Name:</span> {report['customer_name']}
            </div>
            <div class="report-item">
                <span>Email:</span> {report['email']}
            </div>
            <div class="report-item">
                <span>Address:</span> {report['address']}
            </div>
            <div class="report-item">
                <span>Total Services Used:</span> {report['services_used']}
            </div>
            <div class="report-item">
                <span>Total Spent:</span> ${report['total_spent']}
            </div>
            <div class="report-item">
                <span>Date Range:</span> {report['date_range']}
            </div>

            <h2>Service Request History</h2>
            <table>
                <tr>
                    <th>Service Name</th>
                    <th>Booking Date</th>
                    <th>Booking Time</th>
                    <th>Status</th>
                    <th>Rating</th>
                    <th>Review</th>
                    <th>Price</th>
                </tr>
                {service_history_html}
            </table>
        </div>
    </body>
    </html>
    """
    return html_content


celery.conf.beat_schedule = {
    'send-daily-reminders': {
        'task': 'tasks.send_daily_reminders',
        'schedule': crontab(minute='*/3'),
    },
    'send-monthly-report': {
        'task': 'tasks.send_monthly_activity_report',
        'schedule': crontab(minute='*/5'),
    }
}


# ------------------------------------------------Export CSV------------------------------------------------

DOWNLOADS_DIR = os.path.join(os.path.expanduser("~"), "Downloads")
os.makedirs(DOWNLOADS_DIR, exist_ok=True)

@celery.task(name="tasks.export_service_requests")
def export_service_requests(professional_id):
    """Export all closed service requests for a professional as a CSV file in the Downloads folder."""

    closed_requests = ServiceRequest.query.filter(
        ServiceRequest.professional_id == professional_id,
        ServiceRequest.status == "Completed"
    ).all()

    if not closed_requests:
        return "No completed service requests found for export."

    output = StringIO()
    writer = csv.writer(output, delimiter=',', quotechar='"', quoting=csv.QUOTE_MINIMAL)

    # Write CSV headers
    writer.writerow(["Service ID", "Customer ID", "Professional ID", "Request Date", "Remarks"])

    # Write data rows
    for request in closed_requests:
        writer.writerow([
            request.service_id,
            request.customer_id,
            request.professional_id,
            request.request_date.strftime("%Y-%m-%d %H:%M:%S"),
            request.review if request.review else "No remarks"
        ])

    # Save CSV file to Downloads folder
    csv_filename = f"closed_requests_professional_{professional_id}.csv"
    csv_filepath = os.path.join(DOWNLOADS_DIR, csv_filename)

    with open(csv_filepath, "w", newline='') as f:
        f.write(output.getvalue())

    return csv_filepath  # Return the file path


@app.route('/api/admin/professional-requests/<int:professional_id>', methods=['GET'])
@jwt_required()
def get_professional_requests(professional_id):
    """
    Fetch all 'Pending' and 'Completed' service requests for a given professional.
    """
    current_user = get_jwt_identity()

    if current_user["role"] != "Admin":
        return jsonify({"message": "Unauthorized"}), 403

    service_requests = ServiceRequest.query.filter(
        ServiceRequest.professional_id == professional_id,
        ServiceRequest.status.in_(["Pending", "Completed"])
    ).all()

    request_list = [
        {
            "id": req.id,
            "service_name": req.service.name if req.service else "Unknown",
            "customer_name": req.customer.full_name if req.customer else "Unknown",
            "booking_date": req.booking_date.strftime("%Y-%m-%d"),
            "booking_time": req.booking_time.strftime("%H:%M"),
            "status": req.status
        }
        for req in service_requests
    ]

    return jsonify({"requests": request_list}), 200

@app.route('/api/admin/export/<int:professional_id>', methods=['POST'])
@jwt_required()
def trigger_export_requests(professional_id):
    """
    Admin triggers an export of closed service requests for a professional.
    """
    current_user = get_jwt_identity()

    if current_user["role"] != "Admin":
        return jsonify({"message": "Unauthorized"}), 403

    # Trigger Celery task
    task = export_service_requests.delay(professional_id)

    return jsonify({
        "message": "CSV export started. Check available downloads when ready.",
        "task_id": task.id
    }), 202

@app.route('/api/admin/reports/list', methods=['GET'])
@jwt_required()
def list_csv_exports():
    """
    List only previously exported CSV files available for download from the Downloads folder.
    """
    current_user = get_jwt_identity()

    if current_user["role"] != "Admin":
        return jsonify({"message": "Unauthorized"}), 403

    # Ensure the directory exists
    if not os.path.exists(DOWNLOADS_DIR):
        return jsonify({"csv_files": []}), 200

    # Filter only CSV files
    files = [f for f in os.listdir(DOWNLOADS_DIR) if f.endswith(".csv")]

    return jsonify({"csv_files": files}), 200

@app.route('/api/admin/reports/download/<string:filename>', methods=['GET'])
@jwt_required()
def download_csv_file(filename):
    """
    Admin downloads a report file from the 'Downloads' directory.
    """
    current_user = get_jwt_identity()

    if current_user["role"] != "Admin":
        return jsonify({"message": "Unauthorized"}), 403

    file_path = os.path.join(DOWNLOADS_DIR, filename)

    if not os.path.exists(file_path):
        return jsonify({"message": "File not found"}), 404

    return send_from_directory(DOWNLOADS_DIR, filename, as_attachment=True)


# ------------------------------------------------api of app------------------------------------------------


@app.route('/', methods=['GET', 'POST'])
def select():
	return render_template('index.html')

@app.route('/api/register/customer', methods=['POST'])
def register_customer():
    data = request.json
    email = data.get('email')
    password = data.get('password')
    phone_number = data.get('phone_number')
    full_name = data.get('full_name')
    address = data.get('address')
    postal_code = data.get('postal_code')

    if caching.get_user_by_email(email):
        return jsonify({"message": "Email already exists"}), 400

    # Hash the password before storing
    hashed_password = bcrypt.generate_password_hash(password).decode('utf-8')

    new_user = User(
        email=email, password=hashed_password, full_name=full_name,
        phone=phone_number, address=address, postal_code=postal_code,
        user_type='Customer', blocked_status=0
    )
    db.session.add(new_user)
    db.session.commit()
    cache.delete_memoized(caching.get_user_by_email, email)

    # Generate JWT token upon successful registration
    access_token = create_access_token(identity={'id': new_user.id, 'role': new_user.user_type})

    return jsonify({"message": "Registration successful", "token": access_token, "role": new_user.user_type}), 201


@app.route('/api/register/professional', methods=['POST'])
def register_professional():
    email = request.form.get('email')
    password = request.form.get('password')
    full_name = request.form.get('full_name')
    phone_number = request.form.get('phone_number')
    service_name = request.form.get('service_name')
    experience = request.form.get('experience')
    address = request.form.get('address')
    postal_code = request.form.get('postal_code')

    if caching.get_user_by_email(email):
        return jsonify({"message": "Email already exists"}), 400

    hashed_password = bcrypt.generate_password_hash(password).decode('utf-8')

    new_user = User(email=email, password=hashed_password, full_name=full_name,
                    phone=phone_number,
                    address=address, postal_code=postal_code, user_type='Professional', blocked_status=0)
    db.session.add(new_user)
    db.session.commit()

    # Upload documents
    document_paths = []
    if 'documents' in request.files:
        files = request.files.getlist('documents')
        for file in files:
            if file and allowed_file(file.filename):
                filename = secure_filename(file.filename)
                filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
                file.save(filepath)
                document_paths.append(filename)

    new_professional = Professional(
        id=new_user.id, specialization=service_name,
        documents=';'.join(document_paths),
        experience=experience, status='Pending'
    )
    db.session.add(new_professional)
    db.session.commit()
    cache.delete_memoized(caching.get_user_by_email, email)
    access_token = create_access_token(identity={'id': new_user.id, 'role': new_user.user_type})

    return jsonify({"message": "Registration successful", "token": access_token, "role": new_user.user_type}), 201


@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    email = data.get('email')
    password = data.get('password')

    user = caching.get_user_by_email(email)

    if not user or not bcrypt.check_password_hash(user.password, password):
        return jsonify({"message": "Invalid credentials"}), 401

    # Check if the user is blocked
    if user.blocked_status:
        return jsonify({"message": "Your account has been blocked. Please contact support."}), 403

    # If the user is a professional, check their approval status
    if user.user_type == "Professional":
        professional = Professional.query.get(user.id)
        if professional:
            if professional.status == "Pending":
                return jsonify({"message": "Your professional account is still under review. Please wait for approval."}), 403
            elif professional.status == "Rejected":
                return jsonify({"message": "Your professional account has been rejected. You cannot log in."}), 403

    # Generate access token
    access_token = create_access_token(identity={'id': user.id, 'role': user.user_type})
    
    return jsonify({
        "message": "Login successful",
        "token": access_token,
        "role": user.user_type
    }), 200

@app.route('/api/protected', methods=['GET'])
@jwt_required()
def protected():
    current_user = get_jwt_identity()
    return jsonify({"message": "Protected route accessed", "user": current_user}), 200

@app.route('/api/logout', methods=['POST'])
@jwt_required()
def logout():
    return jsonify({"message": "Logged out successfully"}), 200



##-----------------------------------------------Admin apis--------------------------------------------------------

## admin dashboard
@app.route('/api/admin_dashboard', methods=['GET'])
@jwt_required()
def admin_dashboard():
    current_user = get_jwt_identity()

    if current_user["role"] != "Admin":
        return jsonify({"message": "Unauthorized access"}), 403

    completed_requests = ServiceRequest.query.filter(
        ServiceRequest.status == "Completed",
        ServiceRequest.rating.isnot(None)
    ).all()

    total_rating = sum(req.rating for req in completed_requests) if completed_requests else 0
    overall_rating = round(total_rating / len(completed_requests), 2) if completed_requests else 0

    rating_counts = {i: 0 for i in range(1, 6)}
    for request in completed_requests:
        rating_counts[request.rating] += 1

    status_counts = {
        "Completed": ServiceRequest.query.filter_by(status="Completed").count(),
        "Rejected": ServiceRequest.query.filter_by(status="Rejected").count(),
        "Pending": ServiceRequest.query.filter_by(status="Pending").count(),
    }

    return jsonify({
        "overall_rating": overall_rating,
        "rating_counts": rating_counts,
        "status_counts": status_counts
    }), 200

## list of all services
@app.route('/api/services', methods=['GET'])
@jwt_required()
def list_services():
    current_user = get_jwt_identity()

    if current_user["role"] not in ["Admin", "Customer"]:
        return jsonify({"message": "Unauthorized access"}), 403

    services = caching.get_all_services()
    if not services:
        return jsonify({"message": "No services found"}), 404

    services_data = [{
        "id": s.id,
        "name": s.name,
        "description": s.description,
        "base_price": s.base_price,
        "professional_type": s.professional_type
    } for s in services]

    return jsonify(services_data), 200

## add service
@app.route('/api/services', methods=['POST'])
@jwt_required()
def add_service():
    current_user = get_jwt_identity()
    if current_user["role"] != "Admin":
        return jsonify({"message": "Unauthorized"}), 403
    
    data = request.json
    new_service = Service(
        name=data['name'],
        base_price=data['base_price'],
        description=data['description'],
        professional_type=data['professional_type']
    )
    db.session.add(new_service)
    db.session.commit()
    cache.delete('all_services')
    return jsonify({
        "id": new_service.id,
        "name": new_service.name,
        "base_price": new_service.base_price,
        "description": new_service.description,
        "professional_type": new_service.professional_type
    }), 201

## edit service
@app.route('/api/services/<int:service_id>', methods=['PUT'])
@jwt_required()
def edit_service(service_id):
    current_user = get_jwt_identity()
    if current_user["role"] != "Admin":
        return jsonify({"message": "Unauthorized"}), 403
    
    data = request.json
    service = Service.query.get(service_id)
    if not service:
        return jsonify({"message": "Service not found"}), 404

    service.name = data['name']
    service.base_price = data['base_price']
    service.description = data['description']
    service.professional_type = data['professional_type']
    
    db.session.commit()
    cache.delete('all_services')
    return jsonify({"message": "Service updated successfully"})

## delete service
@app.route('/api/services/<int:service_id>', methods=['DELETE'])
@jwt_required()
def delete_service(service_id):
    current_user = get_jwt_identity()

    if current_user["role"] != "Admin":
        return jsonify({"message": "Unauthorized"}), 403
    
    service = Service.query.get(service_id)
    if not service:
        return jsonify({"message": "Service not found"}), 404

    db.session.delete(service)
    db.session.commit()
    cache.delete('all_services')
    return jsonify({"message": "Service deleted successfully"}), 200

## list of all professionals
@app.route('/api/professional-list', methods=['GET'])
@jwt_required()
def professional_list():
    """Fetch the list of professionals including their documents."""
    current_user = get_jwt_identity()
    
    if current_user["role"] not in ["Admin", "Customer"]:
        return jsonify({"message": "Unauthorized access"}), 403

    status_filter = request.args.get('status')
    
    ## filter by status
    if status_filter:
        professionals = Professional.query.filter_by(status=status_filter).all()
    else:
        professionals = Professional.query.all()

    if not professionals:
        return jsonify([]), 200

    professionals_data = []
    
    for p in professionals:
        user = User.query.get(p.id)
        if not user:
            continue
        
        ## document handling
        if isinstance(p.documents, str):
            documents = p.documents.split(",")
        elif isinstance(p.documents, list):
            documents = [doc.filename for doc in p.documents]
        else:
            documents = []

        professionals_data.append({
            "id": p.id,
            "full_name": user.full_name,
            "specialization": p.specialization,
            "experience": p.experience,
            "status": p.status,
            "blocked_status": user.blocked_status,
            "documents": documents
        })

    return jsonify(professionals_data), 200

@app.route('/uploads/documents/<filename>')
def get_document(filename):
    return send_from_directory(app.config["UPLOAD_FOLDER"], filename)

## list professionals
@app.route('/api/professionals', methods=['GET'])
@jwt_required()
def list_professionals():
    current_user = get_jwt_identity()
    
    if current_user["role"] not in ["Admin", "Customer"]:
        return jsonify({"message": "Unauthorized access"}), 403

    status_filter = request.args.get('status')
    
    if status_filter:
        professionals = Professional.query.filter_by(status=status_filter).all()
    else:
        professionals = Professional.query.all()

    if not professionals:
        return jsonify({"message": "No professionals found"}), 404

    professionals_data = [{
        "id": p.id,
        "full_name": User.query.get(p.id).full_name,
        "specialization": p.specialization,
        "experience": p.experience,
        "status": p.status
    } for p in professionals]

    return jsonify(professionals_data), 200

## approve professional
@app.route('/api/professionals/<int:professional_id>/approve', methods=['PUT'])
@jwt_required()
def approve_professional(professional_id):
    current_user = get_jwt_identity()
    
    if current_user["role"] != "Admin":
        return jsonify({"message": "Unauthorized"}), 403

    professional = Professional.query.get(professional_id)
    if not professional:
        return jsonify({"message": "Professional not found"}), 404

    professional.status = "Approved"
    db.session.commit()
    
    return jsonify({"message": "Professional approved successfully"}), 200

## reject professional
@app.route('/api/professionals/<int:professional_id>/reject', methods=['PUT'])
@jwt_required()
def reject_professional(professional_id):
    current_user = get_jwt_identity()

    if current_user["role"] != "Admin":
        return jsonify({"message": "Unauthorized"}), 403

    professional = Professional.query.get(professional_id)
    if not professional:
        return jsonify({"message": "Professional not found"}), 404

    professional.status = "Rejected"
    db.session.commit()
    
    return jsonify({"message": "Professional rejected successfully"}), 200

## block professional
@app.route('/api/professionals/<int:professional_id>/block', methods=['PUT'])
@jwt_required()
def block_professional(professional_id):
    current_user = get_jwt_identity()

    if current_user["role"] != "Admin":
        return jsonify({"message": "Unauthorized"}), 403

    # Fetch the professional
    professional = Professional.query.get(professional_id)
    if not professional:
        return jsonify({"message": "Professional not found"}), 404

    # Fetch the associated user and update `blocked_status`
    user = User.query.get(professional.id)
    if not user:
        return jsonify({"message": "User not found"}), 404

    user.blocked_status = True  # Set user as blocked
    db.session.commit()

    return jsonify({"message": "Professional blocked successfully"}), 200

## unblock professional
@app.route('/api/professionals/<int:professional_id>/unblock', methods=['PUT'])
@jwt_required()
def unblock_professional(professional_id):
    current_user = get_jwt_identity()

    if current_user["role"] != "Admin":
        return jsonify({"message": "Unauthorized"}), 403

    # Fetch the professional
    professional = Professional.query.get(professional_id)
    if not professional:
        return jsonify({"message": "Professional not found"}), 404

    # Fetch the associated user and update `blocked_status`
    user = User.query.get(professional.id)
    if not user:
        return jsonify({"message": "User not found"}), 404

    user.blocked_status = False  # Set user as unblocked
    db.session.commit()

    return jsonify({"message": "Professional unblocked successfully"}), 200

## get professional info in detail
@app.route('/api/professionals/<int:professional_id>', methods=['GET'])
@jwt_required()
def get_professional_details(professional_id):
    """Fetch the details of a specific professional."""
    current_user = get_jwt_identity()

    # Restrict access to Admin and Customers only
    if current_user["role"] not in ["Admin", "Customer","Professional"]:
        return jsonify({"message": "Unauthorized access"}), 403

    professional = Professional.query.get(professional_id)
    if not professional:
        return jsonify({"message": "Professional not found"}), 404

    user = User.query.get(professional.id)
    if not user:
        return jsonify({"message": "User data not found"}), 404

    # Fetch all service requests for this professional
    service_requests = ServiceRequest.query.filter_by(professional_id=professional_id).all()

    # Compute overall rating
    completed_requests = [req for req in service_requests if req.status == "Completed" and req.rating is not None]
    total_rating = sum(req.rating for req in completed_requests) if completed_requests else 0
    overall_rating = round(total_rating / len(completed_requests), 2) if completed_requests else 0

    # Count requests by status
    status_counts = {
        "Completed": len([req for req in service_requests if req.status == "Completed"]),
        "Rejected": len([req for req in service_requests if req.status == "Rejected"]),
        "Assigned": len([req for req in service_requests if req.status == "Accepted"])
    }

    response_data = {
        "professional": {
            "id": professional.id,
            "full_name": user.full_name,
            "specialization": professional.specialization,
            "experience": professional.experience,
            "status": professional.status,
            "blocked_status": user.blocked_status
        },
        "service_requests": [
            {
                "id": req.id,
                "service_name": req.service.name if req.service else "Unknown",
                "status": req.status,
                "rating": req.rating,
                "review": req.review
            } for req in completed_requests
        ],
        "overall_rating": overall_rating,
        "status_counts": status_counts
    }

    return jsonify(response_data), 200

## list of all customers
@app.route("/api/customers", methods=["GET"])
@jwt_required()
def list_customers():
    current_user = get_jwt_identity()

    if current_user["role"] != "Admin":
        return jsonify({"message": "Unauthorized access"}), 403

    customers = User.query.filter_by(user_type="Customer").all()
    customer_list = [
        {
            "id": customer.id,
            "full_name": customer.full_name,
            "email": customer.email,
            "phone": customer.phone,
            "address": customer.address,
            "postal_code": customer.postal_code,
            "status": "Blocked" if customer.blocked_status else "Unblocked"
        }
        for customer in customers
    ]

    return jsonify({"customers": customer_list}), 200

## view customer info in detail
@app.route("/api/customers/<int:id>", methods=["GET"])
@jwt_required()
def view_customer(id):
    """Fetch customer details along with service request history"""
    current_user = get_jwt_identity()

    if current_user["role"] not in ["Admin", "Customer"]:
        return jsonify({"message": "Unauthorized access"}), 403

    # Fetch customer details
    customer = User.query.get_or_404(id)

    # Fetch service requests made by the customer
    service_requests = ServiceRequest.query.filter_by(customer_id=id).all()

    # Calculate overall rating
    completed_requests = [
        req for req in service_requests if req.status == "Completed" and req.rating is not None
    ]
    
    total_rating = sum(req.rating for req in completed_requests) if completed_requests else 0
    overall_rating = round(total_rating / len(completed_requests), 2) if completed_requests else 0

    # Count requests by status
    status_counts = {
        "Completed": sum(1 for req in service_requests if req.status == "Completed"),
        "Rejected": sum(1 for req in service_requests if req.status == "Rejected"),
        "Assigned": sum(1 for req in service_requests if req.status == "Accepted")
    }

    response_data = {
        "customer": {
            "id": customer.id,
            "full_name": customer.full_name,
            "email": customer.email,
            "phone": customer.phone,
            "address": customer.address,
            "postal_code": customer.postal_code,
            "status": "Blocked" if customer.blocked_status else "Unblocked"
        },
        "service_requests": [
            {
                "id": req.id,
                "service_name": req.service.name if req.service else "Unknown",
                "status": req.status,
                "rating": req.rating,
                "review": req.review
            } for req in completed_requests
        ],
        "overall_rating": overall_rating,
        "status_counts": status_counts
    }

    return jsonify(response_data), 200

## block and unblock customer by admin
@app.route("/api/customers/block/<int:id>", methods=["POST"])
@jwt_required()
def block_customer(id):
    """Block or Unblock a customer (Admin Only)"""
    current_user = get_jwt_identity()

    if current_user["role"] != "Admin":
        return jsonify({"message": "Unauthorized access"}), 403

    customer = User.query.get_or_404(id)
    customer.blocked_status = not customer.blocked_status
    db.session.commit()

    return jsonify({
        "message": "Customer status updated successfully",
        "customer_id": id,
        "blocked_status": customer.blocked_status
    }), 200

## list of all service requests
@app.route("/api/service_requests", methods=["GET"])
@jwt_required()
def get_service_requests():
    """Fetch all service requests (Admin and Professional)"""
    current_user = get_jwt_identity()
    
    # Admin can view all requests, professionals can view only their assigned ones
    if current_user["role"] == "Admin":
        requests = ServiceRequest.query.all()
    elif current_user["role"] == "Professional":
        requests = ServiceRequest.query.filter_by(professional_id=current_user["id"]).all()
    else:
        return jsonify({"message": "Unauthorized access"}), 403

    request_list = [
        {
            "id": req.id,
            "customer_name": User.query.get(req.customer_id).full_name if req.customer_id else "Unknown",
            "service_name": Service.query.get(req.service_id).name if req.service_id else "Unknown",
            "professional_name": User.query.get(req.professional_id).full_name if req.professional_id else "Not Assigned",
            "status": req.status,
            "booking_date": req.booking_date.strftime("%Y-%m-%d"),
            "booking_time": req.booking_time.strftime("%H:%M"),
            "rating": req.rating,
            "review": req.review
        }
        for req in requests
    ]

    return jsonify({"service_requests": request_list}), 200

## admin search
@app.route("/api/admin/search", methods=["GET"])
@jwt_required()
def admin_search():
    """Admin Search for Professionals, Customers, and Service Requests"""
    current_user = get_jwt_identity()
    
    if current_user["role"] != "Admin":
        return jsonify({"message": "Unauthorized access"}), 403

    search_query = request.args.get("query", "").lower()

    # Search Professionals
    professionals = Professional.query.join(User).filter(
        or_(
            User.full_name.ilike(f"%{search_query}%"),
            User.email.ilike(f"%{search_query}%"),
            Professional.specialization.ilike(f"%{search_query}%")
        )
    ).all()

    professionals_list = [
        {
            "id": professional.id,
            "full_name": professional.user.full_name,
            "email": professional.user.email,
            "specialization": professional.specialization,
            "status": professional.status
        }
        for professional in professionals
    ]

    # Search Customers
    customers = User.query.filter(
        or_(
            User.full_name.ilike(f"%{search_query}%"),
            User.email.ilike(f"%{search_query}%"),
            User.phone.ilike(f"%{search_query}%")
        ),
        User.user_type == "customer"
    ).all()

    customers_list = [
        {
            "id": customer.id,
            "full_name": customer.full_name,
            "email": customer.email,
            "phone": customer.phone,
            "status": "Blocked" if customer.blocked_status else "Active"
        }
        for customer in customers
    ]

    # Search Service Requests
    service_requests = ServiceRequest.query.join(User, ServiceRequest.customer_id == User.id).join(Service).filter(
        or_(
            User.full_name.ilike(f"%{search_query}%"),
            Service.name.ilike(f"%{search_query}%"),
            ServiceRequest.status.ilike(f"%{search_query}%")
        )
    ).all()

    service_requests_list = [
        {
            "id": request.id,
            "customer_name": User.query.get(request.customer_id).full_name if request.customer_id else "Unknown",
            "service_name": Service.query.get(request.service_id).name if request.service_id else "Unknown",
            "status": request.status,
            "booking_date": request.booking_date.strftime("%Y-%m-%d"),
            "booking_time": request.booking_time.strftime("%H:%M")
        }
        for request in service_requests
    ]

    return jsonify({
        "professionals": professionals_list,
        "customers": customers_list,
        "service_requests": service_requests_list
    }), 200

##-----------------------------------------------Customer apis--------------------------------------------------------

##customer dashboard
@app.route("/api/customer_dashboard", methods=["GET"])
@jwt_required()
def customer_dashboard():
    """Fetch services that the customer has not booked yet"""
    current_user = get_jwt_identity()

    if current_user["role"] != "Customer":
        return jsonify({"message": "Unauthorized access"}), 403

    # Fetch customer data using ID from JWT
    customer = User.query.get(current_user["id"])
    if not customer:
        return jsonify({"message": "Customer not found"}), 404

    # Fetch services not currently booked by the customer
    booked_service_ids = db.session.query(ServiceRequest.service_id).filter_by(customer_id=customer.id).filter(
        ServiceRequest.status.in_(["Pending", "Accepted", "Assigned"])
    ).subquery()

    available_services = Service.query.filter(Service.id.not_in(booked_service_ids)).all()

    services_list = [
        {
            "id": service.id,
            "name": service.name,
            "description": service.description,
            "base_price": service.base_price
        }
        for service in available_services
    ]

    return jsonify({
        "customer_name": customer.full_name,  # Now fetched properly from DB
        "available_services": services_list
    }), 200

## book service by customer
@app.route("/api/book_service", methods=["POST"])
@jwt_required()
def book_service():
    """Allow customers to book a service"""
    current_user = get_jwt_identity()

    if current_user["role"] != "Customer":
        return jsonify({"message": "Unauthorized access"}), 403

    data = request.json
    service_id = data["service_id"]

    existing_booking = ServiceRequest.query.filter_by(customer_id=current_user["id"], service_id=service_id).filter(
        ServiceRequest.status.in_(["Pending", "Accepted", "Assigned"])
    ).first()

    if existing_booking:
        return jsonify({"message": "You already have a booking for this service"}), 400

    customer = User.query.get(current_user["id"])
    customer.address = data.get("address", customer.address)
    customer.phone = data.get("phone", customer.phone)

    # Create new booking
    service_request = ServiceRequest(
        customer_id=current_user["id"],
        service_id=service_id,
        booking_date=datetime.strptime(data["booking_date"], "%Y-%m-%d").date(),
        booking_time=datetime.strptime(data["booking_time"], "%H:%M").time(),
        status="Pending"
    )

    db.session.add(service_request)
    db.session.commit()

    return jsonify({"message": "Booking successfully created!"}), 201

## list of all current bookings by customer
@app.route("/api/current_bookings", methods=["GET", "PUT", "DELETE"])
@jwt_required()
def current_bookings():
    """Single API for fetching, editing, and canceling bookings"""

    current_user = get_jwt_identity()
    if current_user["role"] != "Customer":
        return jsonify({"message": "Unauthorized access"}), 403

    if request.method == "GET":
        bookings = ServiceRequest.query.filter_by(customer_id=current_user["id"]).filter(
            ServiceRequest.status.in_(["Pending", "Accepted"])
        ).all()

        booking_list = [
            {
                "id": booking.id,
                "service_name": Service.query.get(booking.service_id).name if booking.service_id else "Unknown",
                "status": booking.status,
                "booking_date": booking.booking_date.strftime("%Y-%m-%d"),
                "booking_time": booking.booking_time.strftime("%H:%M"),
                "professional_id": booking.professional_id if booking.status == "Accepted" else None  # Include professional_id only for accepted bookings
            }
            for booking in bookings
        ]

        return jsonify({"current_bookings": booking_list}), 200

    # Edit an existing booking
    elif request.method == "PUT":
        data = request.json
        booking_id = data.get("id")
        booking = ServiceRequest.query.get(booking_id)

        if not booking or booking.customer_id != current_user["id"]:
            return jsonify({"message": "Booking not found"}), 404

        if booking.status != "Pending":
            return jsonify({"message": "Cannot edit a booking that has been accepted"}), 403

        booking.booking_date = datetime.strptime(data["booking_date"], "%Y-%m-%d").date()
        booking.booking_time = datetime.strptime(data["booking_time"], "%H:%M").time()
        db.session.commit()

        return jsonify({"message": "Booking updated successfully"}), 200

    # Cancel a booking
    elif request.method == "DELETE":
        booking_id = request.args.get("id")
        booking = ServiceRequest.query.get(booking_id)

        if not booking or booking.customer_id != current_user["id"]:
            return jsonify({"message": "Booking not found"}), 404

        if booking.status != "Pending":
            return jsonify({"message": "Cannot cancel a booking that has been accepted"}), 403

        db.session.delete(booking)
        db.session.commit()

        return jsonify({"message": "Booking cancelled successfully"}), 200

## booking history of customer
@app.route("/api/booking_history", methods=["GET"])
@jwt_required()
def booking_history():
    """Fetch booking history for a customer"""
    current_user = get_jwt_identity()

    if current_user["role"] != "Customer":
        return jsonify({"message": "Unauthorized access"}), 403

    all_bookings = ServiceRequest.query.filter_by(customer_id=current_user["id"]).all()

    booking_list = [
        {
            "id": booking.id,
            "service_name": Service.query.get(booking.service_id).name if booking.service_id else "Unknown",
            "status": booking.status,
            "booking_date": booking.booking_date.strftime("%Y-%m-%d"),
            "booking_time": booking.booking_time.strftime("%H:%M"),
            "rating": booking.rating if booking.rating is not None else "N/A",
            "review": booking.review if booking.review else "No review"
        }
        for booking in all_bookings
    ]

    return jsonify({"booking_history": booking_list}), 200

## review a booking done by customer on completed requests
@app.route("/api/review_booking/<int:booking_id>", methods=["PUT"])
@jwt_required()
def review_booking(booking_id):
    """Submit a review for a completed booking"""
    current_user = get_jwt_identity()

    if current_user["role"] != "Customer":
        return jsonify({"message": "Unauthorized access"}), 403

    booking = ServiceRequest.query.get(booking_id)

    if not booking or booking.customer_id != current_user["id"]:
        return jsonify({"message": "Booking not found"}), 404

    if booking.status != "Completed":
        return jsonify({"message": "Can only review completed bookings"}), 403

    data = request.json
    rating = data.get("rating")
    review = data.get("review")

    if not rating or not review:
        return jsonify({"message": "Rating and review are required"}), 400

    booking.rating = int(rating)
    booking.review = review
    db.session.commit()

    return jsonify({"message": "Review submitted successfully"}), 200

## customer profile
@app.route("/api/profile", methods=["GET", "PUT"])
@jwt_required()
def profile():
    """Fetch or update the customer profile"""
    current_user = get_jwt_identity()

    if current_user["role"] != "Customer":
        return jsonify({"message": "Unauthorized access"}), 403

    customer = User.query.get(current_user["id"])
    if not customer:
        return jsonify({"message": "Customer not found"}), 404

    if request.method == "GET":
        return jsonify({
            "id": customer.id,
            "full_name": customer.full_name,
            "email": customer.email,
            "phone": customer.phone,
            "address": customer.address
        }), 200

    elif request.method == "PUT":
        data = request.json
        customer.full_name = data.get("full_name", customer.full_name)
        customer.phone = data.get("phone", customer.phone)
        customer.address = data.get("address", customer.address)
        
        db.session.commit()
        return jsonify({"message": "Profile updated successfully"}), 200

## customer search
@app.route("/api/customer_search", methods=["GET"])
@jwt_required()
def search_services():
    """Search for only available services (not booked)"""
    query = request.args.get("q", "").strip().lower()

    if not query:
        return jsonify({"message": "Please provide a search query"}), 400

    booked_service_ids = db.session.query(ServiceRequest.service_id).filter(
        ServiceRequest.status.in_(["Pending", "Accepted"])
    ).subquery()

    results = (
        db.session.query(Service)
        .filter(
            (Service.id.not_in(booked_service_ids)) &
            (Service.name.ilike(f"%{query}%"))
        )
        .all()
    )

    search_results = [
        {
            "service_id": service.id,
            "service_name": service.name,
            "description": service.description,
            "base_price": service.base_price
        }
        for service in results
    ]

    return jsonify({"results": search_results}), 200



##-----------------------------------------------Professional apis--------------------------------------------------------

## professional dashboard
@app.route("/api/professional_dashboard", methods=["GET"])
@jwt_required()
def professional_dashboard():
    """Fetch available service requests for a professional"""
    current_user = get_jwt_identity()

    if current_user["role"] != "Professional":
        return jsonify({"message": "Unauthorized access"}), 403

    # Fetch professional data using ID from JWT
    professional = Professional.query.get(current_user["id"])
    if not professional:
        return jsonify({"message": "Professional not found"}), 404

    # Fetch unassigned service requests that match the professional's specialization
    unassigned_requests = ServiceRequest.query.filter_by(professional_id=None, status="Pending").all()

    matching_requests = []
    for req in unassigned_requests:
        if req.service.professional_type == professional.specialization:
            if not req.rejected_by or str(professional.id) not in req.rejected_by.split(";"):
                matching_requests.append({
                    "id": req.id,
                    "service_name": req.service.name,
                    "customer_name": req.customer.full_name,
                    "booking_date": req.booking_date.strftime('%Y-%m-%d'),
                    "booking_time": req.booking_time.strftime('%H:%M'),
                    "remarks": req.review or 'N/A',
                })

    return jsonify({
        "professional_name": professional.user.full_name,
        "service_requests": matching_requests
    }), 200

## accept service request by professional
@app.route("/api/accept_request", methods=["POST"])
@jwt_required()
def accept_request():
    """Allow a professional to accept a service request"""
    current_user = get_jwt_identity()

    if current_user["role"] != "Professional":
        return jsonify({"message": "Unauthorized access"}), 403

    professional = Professional.query.get(current_user["id"])
    if not professional:
        return jsonify({"message": "Professional not found"}), 404

    data = request.get_json()
    request_id = data.get("request_id")

    service_request = ServiceRequest.query.get(request_id)
    if not service_request:
        return jsonify({"message": "Service request not found"}), 404

    if service_request.professional_id:
        return jsonify({"message": "This service request is already assigned"}), 400

    # Assign the professional to the request
    service_request.professional_id = professional.id
    service_request.status = "Accepted"

    db.session.commit()

    return jsonify({"message": "Service request accepted successfully"}), 200

## reject service request by professional
@app.route("/api/reject_request", methods=["POST"])
@jwt_required()
def reject_request():
    """Allow a professional to reject a service request"""
    current_user = get_jwt_identity()

    if current_user["role"] != "Professional":
        return jsonify({"message": "Unauthorized access"}), 403

    professional = Professional.query.get(current_user["id"])
    if not professional:
        return jsonify({"message": "Professional not found"}), 404

    data = request.get_json()
    request_id = data.get("request_id")

    service_request = ServiceRequest.query.get(request_id)
    if not service_request:
        return jsonify({"message": "Service request not found"}), 404

    if service_request.professional_id:
        return jsonify({"message": "This service request is already assigned"}), 400

    # Add the professional's ID to the rejected_by list
    rejected_by_list = service_request.rejected_by.split(";") if service_request.rejected_by else []
    rejected_by_list.append(str(professional.id))
    service_request.rejected_by = ";".join(rejected_by_list)

    db.session.commit()

    return jsonify({"message": "Service request rejected successfully"}), 200

## list of all service requests assigned to professional
@app.route("/api/assigned_requests", methods=["GET"])
@jwt_required()
def assigned_requests():
    """Fetch service requests assigned to a professional"""
    current_user = get_jwt_identity()

    if current_user["role"] != "Professional":
        return jsonify({"message": "Unauthorized access"}), 403

    professional = Professional.query.get(current_user["id"])
    if not professional:
        return jsonify({"message": "Professional not found"}), 404

    # Fetch assigned requests with status "Accepted"
    assigned_requests = ServiceRequest.query.filter_by(professional_id=professional.id, status="Accepted").all()

    assigned_requests_list = [
        {
            "id": req.id,
            "service_name": req.service.name,
            "customer_name": req.customer.full_name,
            "booking_date": req.booking_date.strftime('%Y-%m-%d'),
            "booking_time": req.booking_time.strftime('%H:%M'),
            "remarks": req.review or 'N/A'
        }
        for req in assigned_requests
    ]

    return jsonify({
        "professional_name": professional.user.full_name,
        "assigned_requests": assigned_requests_list
    }), 200

## complete service request by professional
@app.route("/api/complete_request", methods=["POST"])
@jwt_required()
def complete_request():
    """Allow a professional to mark a service request as completed"""
    current_user = get_jwt_identity()

    if current_user["role"] != "Professional":
        return jsonify({"message": "Unauthorized access"}), 403

    professional = Professional.query.get(current_user["id"])
    if not professional:
        return jsonify({"message": "Professional not found"}), 404

    data = request.get_json()
    request_id = data.get("request_id")

    service_request = ServiceRequest.query.get(request_id)
    if not service_request:
        return jsonify({"message": "Service request not found"}), 404

    if service_request.professional_id != professional.id:
        return jsonify({"message": "You are not assigned to this service request"}), 403

    # Update the request status to "Completed"
    service_request.status = "Completed"
    db.session.commit()

    return jsonify({"message": "Service request marked as completed"}), 200

## fetch completed requests by professional
@app.route("/api/completed_requests", methods=["GET"])
@jwt_required()
def completed_requests():
    """Fetch completed service requests for a professional"""
    current_user = get_jwt_identity()

    if current_user["role"] != "Professional":
        return jsonify({"message": "Unauthorized access"}), 403

    professional = Professional.query.get(current_user["id"])
    if not professional:
        return jsonify({"message": "Professional not found"}), 404

    completed_requests = ServiceRequest.query.filter_by(professional_id=professional.id, status="Completed").all()

    completed_requests_list = [
        {
            "id": req.id,
            "service_name": req.service.name,
            "customer_name": req.customer.full_name,
            "booking_date": req.booking_date.strftime('%Y-%m-%d'),
            "booking_time": req.booking_time.strftime('%H:%M'),
            "status": req.status,
            "rating": req.rating if req.rating is not None else None,
            "remarks": req.review or 'N/A'
        }
        for req in completed_requests
    ]

    return jsonify({
        "professional_name": professional.user.full_name,
        "completed_requests": completed_requests_list
    }), 200

## professional profile
@app.route("/api/professional_profile", methods=["GET", "PUT"])
@jwt_required()
def professional_profile():
    """Fetch or update the professional profile"""
    current_user = get_jwt_identity()
    current_user_id = current_user["id"]

    # Ensure the user is a professional
    professional = User.query.filter_by(id=current_user_id, user_type="Professional").first()
    professional_details = Professional.query.filter_by(id=current_user_id).first()

    if not professional or not professional_details:
        return jsonify({"message": "Professional not found"}), 404

    if request.method == "GET":
        return jsonify({
            "id": professional.id,
            "full_name": professional.full_name,
            "email": professional.email,
            "phone": professional.phone,
            "address": professional.address,
            "postal_code": professional.postal_code,
            "specialization": professional_details.specialization,
            "experience": professional_details.experience,
            "status": professional_details.status
        }), 200

    elif request.method == "PUT":
        data = request.json

        professional.full_name = data.get("full_name", professional.full_name)
        professional.phone = data.get("phone", professional.phone)
        professional.address = data.get("address", professional.address)
        professional.postal_code = data.get("postal_code", professional.postal_code)

        professional_details.specialization = data.get("specialization", professional_details.specialization)
        professional_details.experience = data.get("experience", professional_details.experience)

        db.session.commit()
        return jsonify({"message": "Profile updated successfully"}), 200