import os
from jaseci.jsorc.jsorc import JsOrc
from jaseci.element.master import master

class JaseciEngine:
    def __init__(self):
        self.master = master(name="admin")
        self.sentinel = None
        self.setup()

    def setup(self):
        # 1. Load the graph schema and logic
        with open("lesson_master.jac", "r") as f:
            code = f.read()
        
        # 2. Register the sentinel to compiles the JAC code
        self.sentinel = self.master.sentinel_register(name="elimusmart", code=code)
        
        # 3. Ensure the root node exists in the persistent database
        self.master.graph_create(name="main_graph")

    def run_walker(self, walker_name, ctx=None):
        # Executes the walkers defined in lesson_master.jac
        return self.master.walker_run(name=walker_name, nd=self.sentinel, ctx=ctx)

# Global instance to be used by main.py
engine = JaseciEngine()