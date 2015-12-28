process.env.NODE_ENV = 'test';

var chai = require('chai');
var chaiHttp = require('chai-http');
var mongoose = require("mongoose");
var request = require('supertest');
var superagent = require('superagent');
var User = require("../app/models/user");
var Lab = require("../app/models/labs");
var express = require('express')

var app = require("../server");

var should = chai.should();
chai.use(chaiHttp);

describe('POST /signup', function() {

  before(function(done){
    User.collection.drop();
    Lab.collection.drop();
    done();
  });

  after(function(done){
    User.collection.drop();
    Lab.collection.drop();
    done();
  });

  it('Test if signup page working', function(done){
    request(app)
        .post('/signup')
        .type('form')
        .send({
          username: 'kelvin2',
          email: 'kelvin@hotmail.com',
          department: 'Engineering',
          specialization: 'General Purposes',
          password: '1234',
          password2: '1234'
        })
        .expect(302)
        //The user will be redirected to profile if the sign up is successful
        .expect('Location', /\/profile/, done);
  });

  it('Test if logout working', function(done){
    request(app)
        .get('/logout')
        //The user will be redirected to profile if the sign up is successful
        .expect('Location', /\//, done);
  });

  it('Test if login working', function(done){
    request(app)
        .post('/login')
        .type('form')
        .send({
          email: 'kelvin@hotmail.com',
          password: '1234'
        })
        .expect(302)
        //The user will be redirected to profile if the sign up is successful
        .expect('Location', /\/profile/, done);
  });
});
