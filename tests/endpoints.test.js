/* eslint-disable jest/expect-expect */
/* eslint-disable no-undef */
/* eslint-disable jest/valid-expect */
/* eslint-disable no-unused-expressions */
/* eslint-disable jest/prefer-expect-assertions */
import { expect } from 'chai';
import request from 'supertest';
import app from '../server'; // Adjust the path to your server file
import dbClient from '../utils/db';

describe('aPI Endpoints', () => {
  let authToken;

  before(async () => {
    await dbClient.db.collection('users').deleteMany({});
    await dbClient.db.collection('files').deleteMany({});
  });

  it('should return status', () => new Promise((done) => {
    request(app)
      .get('/status')
      .expect(200)
      .end((err, res) => {
        if (err) return done(err);
        expect(res.body).to.have.property('redis', true);
        expect(res.body).to.have.property('db', true);
        done();
        return null;
      });
  }));

  it('should return stats', () => new Promise((done) => {
    request(app)
      .get('/stats')
      .expect(200)
      .end((err, res) => {
        if (err) return done(err);
        expect(res.body).to.have.property('users').that.is.a('number');
        expect(res.body).to.have.property('files').that.is.a('number');
        done();
        return null;
      });
  }));

  it('should create a new user', () => new Promise((done) => {
    request(app)
      .post('/users')
      .send({ email: 'test@example.com', password: 'password123' })
      .expect(201)
      .end((err, res) => {
        if (err) return done(err);
        expect(res.body).to.have.property('email', 'test@example.com');
        expect(res.body).to.have.property('id');
        done();
        return null;
      });
  }));

  it('should authenticate a user and return a token', () => new Promise((done) => {
    request(app)
      .get('/connect')
      .set(
        'Authorization',
        `Basic ${
          Buffer.from('test@example.com:password123').toString('base64')}`,
      )
      .expect(200)
      .end((err, res) => {
        if (err) return done(err);
        expect(res.body).to.have.property('token');
        authToken = res.body.token;
        done();
        return null;
      });
  }));

  it('should return the authenticated user', () => new Promise((done) => {
    request(app)
      .get('/users/me')
      .set('X-Token', authToken)
      .expect(200)
      .end((err, res) => {
        if (err) return done(err);
        expect(res.body).to.have.property('email', 'test@example.com');
        expect(res.body).to.have.property('id');
        done();
        return null;
      });
  }));
  let fileId;

  it('should upload a file', () => new Promise((done) => {
    request(app)
      .post('/files')
      .set('X-Token', authToken)
      .send({
        name: 'testfile.txt',
        type: 'file',
        data: Buffer.from('Hello, world!').toString('base64'),
      })
      .expect(201)
      .end((err, res) => {
        if (err) return done(err);
        expect(res.body).to.have.property('name', 'testfile.txt');
        expect(res.body).to.have.property('type', 'file');
        expect(res.body).to.have.property('userId');
        fileId = res.body.id;
        done();
        return null;
      });
  }));

  //   Add more tests for remaining endpoints
  it('should get a file by ID', () => new Promise((done) => {
    request(app)
      .get(`/files/${fileId}`)
      .set('X-Token', authToken)
      .expect(200)
      .end((err, res) => {
        if (err) return done(err);
        expect(res.body).to.have.property('name');
        expect(res.body).to.have.property('type');
        expect(res.body).to.have.property('userId');
        done();
        return null;
      });
  }));

  it('should list files with pagination', () => new Promise((done) => {
    request(app)
      .get('/files?page=0&parentId=0')
      .set('X-Token', authToken)
      .expect(200)
      .end((err, res) => {
        if (err) return done(err);
        expect(res.body).to.be.an('array');
        done();
        return null;
      });
  }));

  it('should publish a file', () => new Promise((done) => {
    request(app)
      .put(`/files/${fileId}/publish`)
      .set('X-Token', authToken)
      .expect(200)
      .end((err, res) => {
        if (err) return done(err);
        expect(res.body).to.have.property('isPublic', true);
        done();
        return null;
      });
  }));

  it('should unpublish a file', () => new Promise((done) => {
    request(app)
      .put(`/files/${fileId}/unpublish`)
      .set('X-Token', authToken)
      .expect(200)
      .end((err, res) => {
        if (err) return done(err);
        expect(res.body).to.have.property('isPublic', false);
        done();
        return null;
      });
  }));

  it('should get file data', () => new Promise((done) => {
    request(app)
      .get(`/files/${fileId}/data`)
      .set('X-Token', authToken)
      .expect(200)
      .end((err, res) => {
        if (err) return done(err);
        expect(res.text).to.be.a('string');
        done();
        return null;
      });
  }));

  it('should disconnect the user', () => new Promise((done) => {
    request(app).get('/disconnect').set('X-Token', authToken).expect(204, done);
  }));

  it('should return unauthorized for invalid token', () => new Promise((done) => {
    request(app)
      .get('/users/me')
      .set('X-Token', 'invalid_token')
      .expect(401, done);
  }));
});
