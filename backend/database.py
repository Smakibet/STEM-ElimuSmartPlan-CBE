import os

# Configuration for Jaseci persistence
# In a real scenario, this ensures your data survives server restarts
DB_CONFIG = {
    "db_type": "sqlite",
    "db_name": "elimusmart_graph.db"
}

def get_db_url():
    return f"sqlite:///{os.path.join(os.getcwd(), DB_CONFIG['db_name'])}"