from models.models import *
from models.models import db

from flask_caching import Cache

cache = Cache()

# Cache for user by email - used during login/registration
@cache.memoize(timeout=300,)
def get_user_by_email(email):
    return User.query.filter_by(email=email).first()

# Cache list of all services
@cache.cached(timeout=300, key_prefix='all_services')
def get_all_services():
    return Service.query.all()

