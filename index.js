'use strict';
const EnvelopeEncrypt = require('./lib/EnvelopeEncrypt.js');
const encryptor = new EnvelopeEncrypt();
const fs = require('fs');
const path = require('path');

module.exports.get = (event, context, callback) => {
    encryptor.loadData(event.pathParameters.id)
    .then((payload) => {
        callback(null,{
            "statusCode": 200,
            "headers": {"content-type": "application/json"},
            "body": JSON.stringify(payload)
        });
    })
    .catch((err) => {
        callback(null,{
            "statusCode": 404,
            "body": 'Not found'
        });
    });
};

module.exports.create = (event, context, callback) => {
    const body = JSON.parse(event.body)
    encryptor.saveData(body.secret, body.ttl, body.is_e2e)
    .then((res) => {
        callback(null,{
            "statusCode": 200,
            "headers": {"content-type": "application/json"},
            "body": '{"status":"ok","uuid":"'+res+'"}'
        });
    })
    .catch((err) => {
        callback(null,{
            "statusCode": 500,
            "body": JSON.stringify(err)
        });
    });
};

module.exports.index = (event, context, callback) => {
    const body = fs.readFileSync(
        "ui/index.html"
    ).toString()

    callback(null,{
        "statusCode": 200,
        "headers": {"content-type": "text/html"},
        "body": body
    });
};

module.exports.redirect_to_post = (event, context, callback) => {
    const body = fs.readFileSync(
        "ui/redirect_to_post.html"
    ).toString()

    callback(null,{
        "statusCode": 200,
        "headers": {"content-type": "text/html"},
        "body": body
    });
};

module.exports.index_secret = (event, context, callback) => {
    const body = fs.readFileSync(
            "ui/index_secret.html"
        ).toString();

    encryptor.loadData(event.pathParameters.id)
    .then((secret) => {
        callback(null,{
            "statusCode": 200,
            "headers": {"content-type": "text/html"},
            "body": body.replace('SECRET_PLACEHOLDER', JSON.stringify(secret))
        });
    })
    .catch((err) => {
        callback(null,{
            "statusCode": 404,
            "headers": {"content-type": "text/html"},
            "body": body.replace('SECRET_PLACEHOLDER', 'null')
        });
    });


};