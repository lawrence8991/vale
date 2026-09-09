FROM nginx:alpine
COPY App/index.html /usr/share/nginx/html/index.html
COPY App/logo.png /usr/share/nginx/html/logo.png
COPY App/favicon.png /usr/share/nginx/html/favicon.png
COPY App/apple-touch-icon.png /usr/share/nginx/html/apple-touch-icon.png
