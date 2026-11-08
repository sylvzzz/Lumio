FROM debian:bookworm

RUN apt-get update && apt-get install -y --no-install-recommends \
    nginx openssl 

WORKDIR /

# ssl certificate
# -x509 self signed certificate
# nodes: no key in password
# newkey rsa - key + certf
RUN openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /etc/ssl/private/nginx.key \
  -out /etc/ssl/certs/nginx.crt \
  -subj "/CN=localhost"

COPY conf/nginx.conf /etc/nginx/nginx.conf

EXPOSE 443

CMD [ "nginx", "-g", "daemon off;" ]
