import os
import sys
import subprocess
import time
import webbrowser
import platform

# Paths
BACKEND_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'backend')
FRONTEND_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'frontend')

def is_windows():
    return platform.system().lower() == 'windows'

def start_backend():
    """Start the Flask backend server"""
    os.chdir(BACKEND_DIR)
    
    # Activate the virtual environment if it exists
    activate_cmd = os.path.join('venv', 'Scripts', 'activate') if is_windows() else 'source venv/bin/activate'
    
    # Build the command to run the Flask app
    if is_windows():
        cmd = f'python app.py'
    else:
        cmd = f'{activate_cmd} && python app.py'
    
    # Run the command in a new terminal
    print(f"Starting backend server: {cmd}")
    if is_windows():
        return subprocess.Popen(['start', 'cmd', '/k', cmd], shell=True)
    else:
        return subprocess.Popen(['gnome-terminal', '--', 'bash', '-c', cmd])

def start_frontend():
    """Start the React frontend development server"""
    os.chdir(FRONTEND_DIR)
    
    # Build the command to run the React app
    if is_windows():
        cmd = 'npm run dev'
    else:
        cmd = 'npm run dev'
    
    # Run the command in a new terminal
    print(f"Starting frontend server: {cmd}")
    if is_windows():
        return subprocess.Popen(['start', 'cmd', '/k', cmd], shell=True)
    else:
        return subprocess.Popen(['gnome-terminal', '--', 'bash', '-c', cmd])

def main():
    """Main function to start all servers"""
    print("Starting the AI Education Toolkit...")
    
    # Start the backend server
    backend_process = start_backend()
    print("Backend server starting...")
    
    # Wait a few seconds for the backend to initialize
    time.sleep(3)
    
    # Start the frontend server
    frontend_process = start_frontend()
    print("Frontend server starting...")
    
    # Wait for the frontend to initialize
    time.sleep(5)
    
    # Open the browser
    webbrowser.open('http://localhost:5173')
    
    print("\nBoth servers are now running!")
    print("Backend API: http://localhost:5000")
    print("Frontend app: http://localhost:5173")
    print("\nPress Ctrl+C to stop all servers...")
    
    try:
        # Keep the script running until Ctrl+C
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\nShutting down servers...")
        if backend_process:
            backend_process.terminate()
        if frontend_process:
            frontend_process.terminate()
        print("Servers shut down successfully!")

if __name__ == "__main__":
    main() 