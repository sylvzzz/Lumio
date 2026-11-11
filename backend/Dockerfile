FROM python:3.12

WORKDIR /app

COPY requirements.txt ./
RUN pip install -r requirements.txt

COPY . .

# Cópia intocada: o bind mount de /app/data sombreia o conteúdo da imagem.
RUN mkdir data_src && cp -r data/shared data_src/

EXPOSE 8000

CMD ["uvicorn", "api:app", "--host", "0.0.0.0", "--port", "8000"]