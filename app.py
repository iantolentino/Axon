from flask import Flask, render_template, request, jsonify, redirect, url_for, send_file
from flask_sqlalchemy import SQLAlchemy
from flask_compress import Compress
from datetime import datetime, date, timedelta
import os
import json
import csv
import io
from functools import wraps
import time

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///second_brain.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev-key-please-change-in-production')
app.config['COMPRESS_MIMETYPES'] = ['text/html', 'text/css', 'application/json', 'application/javascript']

Compress(app)

db = SQLAlchemy(app)

# Database Models
class Task(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    due_date = db.Column(db.DateTime)
    completed = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class Note(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    content = db.Column(db.Text, nullable=False)
    tags = db.Column(db.String(500))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class DailyLog(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    date = db.Column(db.Date, unique=True, nullable=False)
    accomplishments = db.Column(db.Text)
    missed_items = db.Column(db.Text)
    tomorrow_plan = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class Habit(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    streak_count = db.Column(db.Integer, default=0)
    last_completed = db.Column(db.Date)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

# Smart Functions
def generate_daily_recap():
    today = date.today()
    
    completed_tasks = Task.query.filter(
        db.func.date(Task.updated_at) == today,
        Task.completed == True
    ).all()
    
    overdue_tasks = Task.query.filter(
        Task.due_date < datetime.now(),
        Task.completed == False
    ).all()
    
    recent_notes = Note.query.filter(
        db.func.date(Note.created_at) == today
    ).all()
    
    recap = {
        'completed_count': len(completed_tasks),
        'overdue_count': len(overdue_tasks),
        'notes_count': len(recent_notes),
        'summary': generate_ai_summary(completed_tasks, overdue_tasks, recent_notes),
        'productivity_score': calculate_productivity_score(completed_tasks, overdue_tasks)
    }
    
    return recap

def generate_ai_summary(completed_tasks, overdue_tasks, recent_notes):
    if not completed_tasks and not recent_notes:
        return "A quiet day. Consider adding some tasks or notes for tomorrow!"
    
    summary_parts = []
    
    if completed_tasks:
        task_titles = [task.title for task in completed_tasks[:3]]
        if len(completed_tasks) > 3:
            summary_parts.append(f"Completed {len(completed_tasks)} tasks including: {', '.join(task_titles)}...")
        else:
            summary_parts.append(f"Completed: {', '.join(task_titles)}")
    
    if overdue_tasks:
        summary_parts.append(f"⚠️ {len(overdue_tasks)} tasks overdue")
    
    if recent_notes:
        summary_parts.append(f"Captured {len(recent_notes)} new ideas")
    
    productivity = len(completed_tasks) - len(overdue_tasks)
    if productivity > 3:
        summary_parts.append("Great productivity today! 🎉")
    elif productivity > 0:
        summary_parts.append("Good progress made today! 👍")
    else:
        summary_parts.append("Every day is a new opportunity! 🌟")
    
    return " ".join(summary_parts)

def calculate_productivity_score(completed_tasks, overdue_tasks):
    base_score = len(completed_tasks) * 10
    penalty = len(overdue_tasks) * 5
    score = max(0, min(100, base_score - penalty))
    return score

def initialize_default_habits():
    existing_habits = Habit.query.count()
    if existing_habits > 0:
        return
    
    default_habits = [
        {"name": "Morning Planning", "description": "Plan your day each morning"},
        {"name": "Evening Review", "description": "Review accomplishments each evening"},
        {"name": "Daily Exercise", "description": "30 minutes of physical activity"},
        {"name": "Learning Time", "description": "Spend time learning something new"}
    ]
    
    for habit_data in default_habits:
        habit = Habit(
            name=habit_data["name"],
            description=habit_data["description"]
        )
        db.session.add(habit)
    
    db.session.commit()

def update_habit_streak(habit_id, completed=True):
    habit = Habit.query.get(habit_id)
    today = date.today()
    
    if completed:
        if habit.last_completed and (today - habit.last_completed).days == 1:
            habit.streak_count += 1
        elif not habit.last_completed or (today - habit.last_completed).days > 1:
            habit.streak_count = 1
        habit.last_completed = today
    else:
        if habit.last_completed and (today - habit.last_completed).days > 1:
            habit.streak_count = 0
    
    db.session.commit()
    return habit.streak_count

# Routes
@app.route('/')
def index():
    today = date.today()
    today_tasks = Task.query.filter(
        (Task.due_date <= datetime.today()) | (Task.due_date.is_(None)),
        Task.completed == False
    ).order_by(Task.due_date.asc()).limit(50).all()
    
    completed_today = Task.query.filter(
        db.func.date(Task.updated_at) == today,
        Task.completed == True
    ).count()
    
    recent_notes = Note.query.order_by(Note.updated_at.desc()).limit(10).all()
    current_date = datetime.now()
    daily_recap = generate_daily_recap()
    
    tasks_count = Task.query.count()
    notes_count = Note.query.count()
    habits_count = Habit.query.count()
    completed_tasks_count = Task.query.filter_by(completed=True).count()
    
    return render_template('index.html', 
                         today_tasks=today_tasks,
                         completed_today=completed_today,
                         recent_notes=recent_notes,
                         current_date=current_date,
                         daily_recap=daily_recap,
                         tasks_count=tasks_count,
                         notes_count=notes_count,
                         habits_count=habits_count,
                         completed_tasks_count=completed_tasks_count)

@app.route('/tasks')
def tasks():
    all_tasks = Task.query.order_by(Task.due_date.asc()).all()
    return render_template('tasks.html', tasks=all_tasks)

@app.route('/notes')
def notes():
    all_notes = Note.query.order_by(Note.updated_at.desc()).all()
    return render_template('notes.html', notes=all_notes)

@app.route('/logs')
def logs():
    recent_logs = DailyLog.query.order_by(DailyLog.date.desc()).limit(7).all()
    return render_template('logs.html', logs=recent_logs)

@app.route('/habits')
def habits():
    initialize_default_habits()
    all_habits = Habit.query.all()
    today_date = date.today()
    return render_template('habits.html', habits=all_habits, date=today_date)

@app.route('/search')
def search():
    query = request.args.get('q', '')
    results = search_content(query) if query else {'tasks': [], 'notes': [], 'habits': []}
    return render_template('search.html', results=results, query=query)

@app.route('/export')
def export_data():
    tasks_count = Task.query.count()
    notes_count = Note.query.count()
    habits_count = Habit.query.count()
    completed_tasks_count = Task.query.filter_by(completed=True).count()
    
    return render_template('export.html',
                         tasks_count=tasks_count,
                         notes_count=notes_count,
                         habits_count=habits_count,
                         completed_tasks_count=completed_tasks_count)

# API Routes for Tasks
@app.route('/api/tasks', methods=['POST'])
def create_task():
    data = request.get_json()
    
    due_date = None
    if data.get('due_date'):
        try:
            due_date_str = data['due_date']
            if 'T' in due_date_str:
                due_date = datetime.fromisoformat(due_date_str)
            else:
                due_date = datetime.strptime(due_date_str, '%Y-%m-%d')
        except:
            due_date = None
    
    task = Task(
        title=data['title'],
        description=data.get('description', ''),
        due_date=due_date
    )
    db.session.add(task)
    db.session.commit()
    return jsonify({'id': task.id, 'message': 'Task created successfully'})

@app.route('/api/tasks/<int:task_id>', methods=['PUT'])
def update_task(task_id):
    task = Task.query.get_or_404(task_id)
    data = request.get_json()
    
    if 'completed' in data:
        task.completed = data['completed']
    if 'title' in data:
        task.title = data['title']
    if 'description' in data:
        task.description = data['description']
    if 'due_date' in data and data['due_date']:
        try:
            task.due_date = datetime.fromisoformat(data['due_date'].replace('Z', '+00:00'))
        except:
            pass
    
    db.session.commit()
    return jsonify({'message': 'Task updated successfully'})

@app.route('/api/tasks/<int:task_id>', methods=['DELETE'])
def delete_task(task_id):
    task = Task.query.get_or_404(task_id)
    db.session.delete(task)
    db.session.commit()
    return jsonify({'message': 'Task deleted successfully'})

@app.route('/api/tasks/<int:task_id>')
def get_task(task_id):
    task = Task.query.get_or_404(task_id)
    return jsonify({
        'id': task.id,
        'title': task.title,
        'description': task.description,
        'due_date': task.due_date.isoformat() if task.due_date else '',
        'completed': task.completed
    })

# API Routes for Notes
@app.route('/api/notes', methods=['POST'])
def create_note():
    data = request.get_json()
    note = Note(
        content=data['content'],
        tags=data.get('tags', '')
    )
    db.session.add(note)
    db.session.commit()
    return jsonify({'id': note.id, 'message': 'Note created successfully'})

@app.route('/api/notes/<int:note_id>', methods=['PUT'])
def update_note(note_id):
    note = Note.query.get_or_404(note_id)
    data = request.get_json()
    note.content = data['content']
    note.tags = data.get('tags', '')
    db.session.commit()
    return jsonify({'message': 'Note updated successfully'})

@app.route('/api/notes/<int:note_id>', methods=['DELETE'])
def delete_note(note_id):
    note = Note.query.get_or_404(note_id)
    db.session.delete(note)
    db.session.commit()
    return jsonify({'message': 'Note deleted successfully'})

# API Routes for Logs - COMPLETE AND WORKING
@app.route('/api/logs', methods=['POST'])
def create_log():
    try:
        data = request.get_json()
        today = date.today()
        
        # Check if log already exists for today
        existing_log = DailyLog.query.filter_by(date=today).first()
        if existing_log:
            return jsonify({'error': 'Log already exists for today'}), 400
        
        log = DailyLog(
            date=today,
            accomplishments=data.get('accomplishments', ''),
            missed_items=data.get('missed_items', ''),
            tomorrow_plan=data.get('tomorrow_plan', '')
        )
        db.session.add(log)
        db.session.commit()
        return jsonify({'id': log.id, 'message': 'Daily log created successfully'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/logs/<int:log_id>', methods=['PUT'])
def update_log(log_id):
    try:
        log = DailyLog.query.get_or_404(log_id)
        data = request.get_json()
        
        log.accomplishments = data.get('accomplishments', log.accomplishments)
        log.missed_items = data.get('missed_items', log.missed_items)
        log.tomorrow_plan = data.get('tomorrow_plan', log.tomorrow_plan)
        
        db.session.commit()
        return jsonify({'message': 'Log updated successfully'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/logs/<int:log_id>', methods=['DELETE'])
def delete_log(log_id):
    try:
        log = DailyLog.query.get_or_404(log_id)
        db.session.delete(log)
        db.session.commit()
        return jsonify({'message': 'Log deleted successfully'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/logs/today')
def get_today_log():
    try:
        today = date.today()
        log = DailyLog.query.filter_by(date=today).first()
        
        if log:
            return jsonify({
                'id': log.id,
                'date': log.date.isoformat(),
                'accomplishments': log.accomplishments or '',
                'missed_items': log.missed_items or '',
                'tomorrow_plan': log.tomorrow_plan or '',
                'exists': True
            })
        else:
            return jsonify({'exists': False})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# API Routes for Habits
@app.route('/api/habits')
def get_habits():
    habits = Habit.query.all()
    habit_list = []
    
    for habit in habits:
        habit_list.append({
            'id': habit.id,
            'name': habit.name,
            'description': habit.description,
            'streak_count': habit.streak_count,
            'last_completed': habit.last_completed.isoformat() if habit.last_completed else None
        })
    
    return jsonify(habit_list)

@app.route('/api/habits/<int:habit_id>/complete', methods=['POST'])
def complete_habit(habit_id):
    streak = update_habit_streak(habit_id, True)
    return jsonify({'message': 'Habit completed!', 'streak': streak})

@app.route('/api/habits/<int:habit_id>/skip', methods=['POST'])
def skip_habit(habit_id):
    streak = update_habit_streak(habit_id, False)
    return jsonify({'message': 'Habit skipped', 'streak': streak})

@app.route('/api/initialize-habits', methods=['POST'])
def api_initialize_habits():
    initialize_default_habits()
    return jsonify({'message': 'Default habits initialized'})

# Other APIs
@app.route('/api/daily-recap')
def get_daily_recap():
    recap = generate_daily_recap()
    return jsonify(recap)

@app.route('/api/export/csv')
def export_csv():
    output = io.StringIO()
    writer = csv.writer(output)
    
    writer.writerow(['Type', 'Title/Content', 'Description/Tags', 'Status', 'Created Date'])
    
    tasks = Task.query.all()
    for task in tasks:
        writer.writerow([
            'Task',
            task.title,
            task.description or '',
            'Completed' if task.completed else 'Pending',
            task.created_at.strftime('%Y-%m-%d')
        ])
    
    notes = Note.query.all()
    for note in notes:
        writer.writerow([
            'Note',
            note.content[:50] + '...' if len(note.content) > 50 else note.content,
            note.tags or '',
            'Active',
            note.created_at.strftime('%Y-%m-%d')
        ])
    
    habits = Habit.query.all()
    for habit in habits:
        writer.writerow([
            'Habit',
            habit.name,
            habit.description or '',
            f'Streak: {habit.streak_count} days',
            habit.created_at.strftime('%Y-%m-%d')
        ])
    
    output.seek(0)
    return send_file(
        io.BytesIO(output.getvalue().encode('utf-8')),
        mimetype='text/csv',
        as_attachment=True,
        download_name=f'second_brain_export_{datetime.now().strftime("%Y%m%d")}.csv'
    )

@app.route('/api/export/json')
def export_json():
    data = {
        'tasks': [],
        'notes': [],
        'habits': [],
        'logs': [],
        'export_date': datetime.now().isoformat(),
        'version': '1.0'
    }
    
    tasks = Task.query.all()
    for task in tasks:
        data['tasks'].append({
            'title': task.title,
            'description': task.description,
            'due_date': task.due_date.isoformat() if task.due_date else None,
            'completed': task.completed,
            'created_at': task.created_at.isoformat()
        })
    
    notes = Note.query.all()
    for note in notes:
        data['notes'].append({
            'content': note.content,
            'tags': note.tags,
            'created_at': note.created_at.isoformat()
        })
    
    habits = Habit.query.all()
    for habit in habits:
        data['habits'].append({
            'name': habit.name,
            'description': habit.description,
            'streak_count': habit.streak_count,
            'last_completed': habit.last_completed.isoformat() if habit.last_completed else None,
            'created_at': habit.created_at.isoformat()
        })
    
    logs = DailyLog.query.all()
    for log in logs:
        data['logs'].append({
            'date': log.date.isoformat(),
            'accomplishments': log.accomplishments,
            'missed_items': log.missed_items,
            'tomorrow_plan': log.tomorrow_plan,
            'created_at': log.created_at.isoformat()
        })
    
    return jsonify(data)

@app.route('/health')
def health_check():
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat(),
        'version': '1.0.0'
    })

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
        initialize_default_habits()
    
    debug_mode = os.environ.get('FLASK_DEBUG', 'True').lower() == 'true'
    app.run(debug=debug_mode, host='0.0.0.0', port=int(os.environ.get('PORT', 5000)))