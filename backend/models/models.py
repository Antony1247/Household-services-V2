from datetime import datetime
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

class User(db.Model):
    __tablename__ = 'Users'
    
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(100), unique=True, nullable=False)
    password = db.Column(db.String(100), nullable=False)
    full_name = db.Column(db.String(100), nullable=False)
    phone = db.Column(db.String(15))
    address = db.Column(db.String(255))
    postal_code = db.Column(db.String(10))
    user_type = db.Column(db.String(20), nullable=False)  # "admin", "professional", "customer"
    blocked_status = db.Column(db.Boolean, default=False)
    
    # Relationships
    professional = db.relationship("Professional", backref="user", uselist=False)
    service_requests = db.relationship("ServiceRequest", backref="customer", foreign_keys="ServiceRequest.customer_id")



class Professional(db.Model):
    __tablename__ = 'Professionals'
    
    id = db.Column(db.Integer, db.ForeignKey('Users.id'), primary_key=True)
    specialization = db.Column(db.String(100))
    documents = db.Column(db.Text)
    experience = db.Column(db.Integer)
    status = db.Column(db.String(20), nullable=False, default="Pending")

    # Relationships
    service_requests = db.relationship("ServiceRequest", backref="professional", foreign_keys="ServiceRequest.professional_id")


    def __init__(self, id, specialization, experience, documents="", status="Pending"):
        self.id = id
        self.specialization = specialization
        self.experience = experience
        self.documents = documents
        self.status = status



class Service(db.Model):
    __tablename__ = 'Services'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    base_price = db.Column(db.Float, nullable=False)
    professional_type = db.Column(db.String(100))
    
    # Relationships
    service_requests = db.relationship("ServiceRequest", backref="service")



class ServiceRequest(db.Model):
    __tablename__ = 'Service_Requests'
    
    id = db.Column(db.Integer, primary_key=True)
    customer_id = db.Column(db.Integer, db.ForeignKey('Users.id'), nullable=False)
    professional_id = db.Column(db.Integer, db.ForeignKey('Professionals.id'))
    service_id = db.Column(db.Integer, db.ForeignKey('Services.id'), nullable=False)
    request_date = db.Column(db.DateTime, default=datetime.utcnow)
    booking_date = db.Column(db.Date, nullable=False) 
    booking_time = db.Column(db.Time, nullable=False)
    status = db.Column(db.String(20), nullable=False)  # "Pending", "Accepted", "Rejected", "Completed"
    rating = db.Column(db.Integer)
    review = db.Column(db.Text)
    rejected_by = db.Column(db.Text, default="")