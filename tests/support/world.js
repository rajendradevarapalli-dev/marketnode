const { setWorldConstructor, World } = require('@cucumber/cucumber');
const { request } = require('@playwright/test');
require('dotenv').config();

class CustomWorld extends World {
  constructor(options) {
    super(options);
    this.baseURL = process.env.BASE_URL || 'http://localhost:8080';
    this.apiContext = null;
    this.response = null;
    this.responseBody = null;
    this.currentUser = null;
    this.lastBondId = null;
  }

  async init() {
    this.apiContext = await request.newContext({ baseURL: this.baseURL });
  }

  async dispose() {
    if (this.apiContext) {
      await this.apiContext.dispose();
    }
  }
}

setWorldConstructor(CustomWorld);
