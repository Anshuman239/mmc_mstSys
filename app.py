import os
from dotenv import load_dotenv
from flask import Flask, render_template, request, redirect, url_for, flash
from werkzeug.security import generate_password_hash, check_password_hash
from sqlite3 import connect, Error
from re import fullmatch

app = Flask(__name__)

@app.route('/')
def index():
    return "<p>Welcome to the Flask App!</p>"