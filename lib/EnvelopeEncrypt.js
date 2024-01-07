const { DynamoDBDocument } = require('@aws-sdk/lib-dynamodb');
const { DynamoDB } = require('@aws-sdk/client-dynamodb');
const { KMS } = require('@aws-sdk/client-kms');

const crypto = require('crypto');
const uuid = require('uuid');

const ALGO = 'aes256';
const IV = "5183666c72eec9e4";
const KeyId = process.env.ENCRYPTION_KEY_ID;
const TableName = process.env.DYNAMODB_TABLE;

class EnvelopeEncrypt {
    /**
     * @param {string} secret data to be stored
     * @param {int} ttl ttl in seconds
     * @param {bool} is_e2e whether the record is end-to-end encrypted
     *
     * @return {string} ID of the stored record
     */
    saveData(secret, ttl, is_e2e) {
        const kms = new KMS();
        return kms.generateDataKey({ KeyId, KeySpec: 'AES_256' })
          .then((dataKey) => {
            const secretData = {
                dataKey: dataKey.CiphertextBlob,
                secret: this.encrypt(dataKey.Plaintext, secret),
                secretId: uuid(),
                is_e2e: is_e2e,
                ttl: (Math.floor(Date.now()/1000) + ttl)
            };
            const params = {
                TableName,
                Item: secretData,
            };
            const dynamodb = DynamoDBDocument.from(new DynamoDB());
            return dynamodb.put(params)
                .then(res => {
                    return secretData.secretId;
                });
          });
    }

  /**
     * @param {string} secretId ID of the stored record
     *
     * @return {string} secret data
     */
  loadData(secretId) {
    const dynamodb = DynamoDBDocument.from(new DynamoDB());
    const params = {
      TableName,
      Key: { secretId },
    };
    return dynamodb.get(params)
      .then((record) => {
        if (record.Item !== undefined) {
          const kms = new KMS();
          return kms.decrypt({ CiphertextBlob: Buffer.from(record.Item.dataKey, 'base64') })
            .then((dataKey) => {
              Object.assign(record.Item, { secret: this.decrypt(dataKey.Plaintext.toString('base64'), record.Item.secret) });
              return dynamodb
                .delete({TableName, Key: {secretId}})
                .then(res => {
                    // if (record.Item.ttl)

                    return {
                      "text": record.Item.secret,
                      "is_e2e": record.Item.is_e2e
                    };
                });
            });
        }
        throw new Error('Not found');
      });
  }

  encrypt(keyBase64, payload) {
    const cipher = crypto.createCipheriv(ALGO, Buffer.from(keyBase64, 'base64'), IV);
    return (Buffer.concat([cipher.update(payload, 'utf8'), cipher.final()])).toString('base64');
  }

  decrypt(keyBase64, payload) {
    const cipher = crypto.createDecipheriv(ALGO, Buffer.from(keyBase64, 'base64'), IV);
    return (Buffer.concat([cipher.update(payload, 'base64'), cipher.final()])).toString('utf8');
  }
}

module.exports = EnvelopeEncrypt;