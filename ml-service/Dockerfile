FROM python:3.10-slim

WORKDIR /app

COPY ml-service/requirements.txt requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY ml-service /app/ml-service
COPY shared /app/shared

EXPOSE 8000

WORKDIR /app/ml-service

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
