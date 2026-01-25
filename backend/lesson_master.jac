from fastapi import FastAPI, Request, HTTPException
from jaseci.prim.master import master
import uvicorn

app = FastAPI()

# Initialize Jaseci Admin
class JaseciInterface:
    def __init__(self):
        self.session = master(name="admin")
        # Load the JAC code
        with open("lesson_master.jac", "r") as f:
            code = f.read()
        self.sentinel = self.session.sentinel_register(name="elimusmart", code=code)
        self.graph = self.session.graph_create(name="main_graph")

    def run_walker(self, walker_name, ctx):
        return self.session.walker_run(name=walker_name, nd=self.sentinel, ctx=ctx)

interface = JaseciInterface()

@app.post("/walker/generate_lesson")
async def generate_lesson(request: Request):
    data = await request.json()
    try:
        result = interface.run_walker("generate_lesson", data)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)