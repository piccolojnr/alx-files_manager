import { MongoClient, ObjectId } from 'mongodb';

class DBClient {
  constructor() {
    const host = process.env.DB_HOST || 'localhost';
    const port = process.env.DB_PORT || 27017;
    const database = process.env.DB_DATABASE || 'files_manager';

    const url = `mongodb://${host}:${port}`;

    this.client = new MongoClient(url, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    this.client
      .connect()
      .catch((err) => console.error('MongoDB connection error:', err));

    this.db = this.client.db(database);
  }

  isAlive() {
    return !!this.db;
  }

  async nbUsers() {
    return this.db.collection('users').countDocuments();
  }

  async nbFiles() {
    return this.db.collection('files').countDocuments();
  }

  async findUser(user) {
    return this.db.collection('users').findOne(user);
  }

  async createUser(user) {
    return this.db.collection('users').insertOne(user);
  }

  getPrimaryKey(id) {
    return this.db.collection('users').findOne({ _id: ObjectId(id) });
  }
}

const dbClient = new DBClient();

export default dbClient;
