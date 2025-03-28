import os
import sqlalchemy
from sqlalchemy import create_engine
from sqlalchemy import Table, Column, Integer, String, ForeignKey 
from sqlalchemy import select


from sqlalchemy.orm import Session 
from sqlalchemy.orm import declarative_base 
from sqlalchemy.orm import relationship

from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from werkzeug.utils import secure_filename
from flask_cors import CORS
from flask_bcrypt import Bcrypt
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
from flask_caching import Cache
from models.caching import cache
from flasgger import Swagger


from models.models import db

current_dir = os.path.abspath(os.path.dirname(__file__))

Base = declarative_base()

app = None

def create_app():
	BASE_DIR = os.path.abspath(os.path.dirname(__file__))
	PROJECT_ROOT = os.path.dirname(BASE_DIR)
	TEMPLATES_FOLDER = os.path.join(PROJECT_ROOT, "frontend", "src")
	STATIC_FOLDER = os.path.join(PROJECT_ROOT, "frontend", "components")
	app = Flask(__name__, template_folder=TEMPLATES_FOLDER,static_folder=STATIC_FOLDER)
	CORS(app)
	app.config['SQLALCHEMY_DATABASE_URI'] = "sqlite:///"+ os.path.join(current_dir, "database.sqlite3")
	app.config['JWT_SECRET_KEY'] = 'your_secret_key'
	app.config['CACHE_TYPE'] = 'RedisCache'
	app.config['CACHE_REDIS_HOST'] = 'localhost'
	app.config['CACHE_REDIS_PORT'] = 6379
	bcrypt = Bcrypt(app)
	jwt = JWTManager(app)

# Define the new upload folder in the frontend static directory
	app.config['UPLOAD_FOLDER'] = os.path.join(PROJECT_ROOT,'frontend' ,'components','uploads', 'documents')
	os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
	db.init_app(app)
	cache.init_app(app)
	app.app_context().push ()
	return app

app = create_app()
from routes.controllers import *



if __name__ == '__main__':
	app.static_folder = '/Users/antonyjalappat/MAD2/frontend/components'
	app.run(debug=True)