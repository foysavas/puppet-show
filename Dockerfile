# FROM node:16
FROM public.ecr.aws/bitnami/node:16

RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

ENV JAVA_HOME /usr/lib/jvm/java-8-openjdk-amd64

RUN echo "deb http://ftp.debian.org/debian stretch-backports main" > /etc/apt/sources.list.d/stretch-backports.list
RUN apt-get -o Acquire::Check-Valid-Until=false update

RUN apt-get install software-properties-common -y --no-install-recommends

RUN apt-add-repository 'deb http://security.debian.org/debian-security stretch/updates main'
RUN apt-get -o Acquire::Check-Valid-Until=false update

RUN apt-get install -y --no-install-recommends \
    g++ build-essential \
    openjdk-8-jre \
    postgresql-client \
    libxss1

RUN apt-get -t stretch-backports install fonts-open-sans

COPY package-lock.json /usr/src/app/
COPY package.json /usr/src/app/
RUN npm install --allow-root --unsafe-perm
COPY . /usr/src/app

EXPOSE 2000

CMD ["npm","run","start"]
