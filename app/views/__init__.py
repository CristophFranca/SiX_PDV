from flask import Blueprint

bp = Blueprint("views", __name__)

from . import pages  # noqa: E402, F401
