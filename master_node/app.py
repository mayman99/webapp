import asyncio
import requests
from fastapi import FastAPI, UploadFile, File, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
import base64
import io
from PIL import Image

app = FastAPI()
# app.mount("/static", StaticFiles(directory="static"), name="static")
# templates = Jinja2Templates(directory="templates")
SD_API_URL = "http://127.0.0.1:7861/sdapi/v1/img2img"  # Replace with the actual API endpoint URL

# Configure CORS
origins = [
    "http://localhost",
    "http://localhost:8000",
    "http://localhost:3000"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

@app.post("/upload-image/")
async def upload_image(image: dict):
    # Start the processing script asynchronously
    asyncio.create_task(process_image(image))

    return {
        "status": "Processing started"
    }

@app.websocket("/progress/{image_name}")
async def websocket_endpoint(websocket: WebSocket, image_name: str):
    await websocket.accept()

    # Process the image and send progress updates
    progress = await process_image(image_name, websocket)
    await websocket.send_text(progress)

    # Close the websocket connection
    await websocket.close()


async def process_image(image: str):
    # Read Image in RGB order
    encoded_image = image.get('data')
    # A1111 payload
    payload = {
        "init_images": [encoded_image],
        "batch_size": 1,
        "steps": 20,
        "cfg_scale": 7,
        "alwayson_scripts": {
            "controlnet": {
                "args": [
                    {
                        "input_image": encoded_image,
                        "module": "canny",
                        "model": None,
                    }
                ]
            }
        }
    }

    # Make a POST request to the stable diffusion API
    response = requests.post(SD_API_URL, json=payload)

    # Read results
    r = response.json()
    result = r['images'][0]
    image = Image.open(io.BytesIO(base64.b64decode(result.split(",", 1)[0])))
    image.save('output.png')
  
    print(response)

    if response.status_code == 200:
        # Processing successful, obtain the result and send progress updates
        result = response.content  # Assuming the API returns the processed image
        # Process the result and send progress updates, e.g., in chunks
        for chunk in process_result_chunks(result):
            await websocket.send_text(chunk)
    else:
        # Processing failed, send an error message
        await websocket.send_text("Processing failed")

    # Return a completion message
    return "Processing complete"


def process_result_chunks(result):
    # Split the result into chunks for progress updates
    chunk_size = 1024  # Set the desired chunk size
    for i in range(0, len(result), chunk_size):
        yield result[i:i+chunk_size]


# @app.get("/")
# async def index():
#     return templates.TemplateResponse("index.html", {"request": request})


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="localhost", port=8000)
