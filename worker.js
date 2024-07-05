import Bull from 'bull';
import { promises as fs } from 'fs';
import imageThumbnail from 'image-thumbnail';
import { ObjectId } from 'mongodb';
import dbClient from './utils/db';

const fileQueue = new Bull('fileQueue');
const userQueue = new Bull('userQueue');

fileQueue.process(async (job) => {
  const { fileId, userId } = job.data;

  if (!fileId) {
    throw new Error('Missing fileId');
  }
  if (!userId) {
    throw new Error('Missing userId');
  }

  const file = await dbClient.db
    .collection('files')
    .findOne({ _id: ObjectId(fileId), userId: ObjectId(userId) });

  if (!file) {
    throw new Error('File not found');
  }

  const { localPath } = file;
  const sizes = [500, 250, 100];

  await Promise.all(
    sizes.map(async (size) => {
      const options = { width: size };
      const thumbnail = await imageThumbnail(localPath, options);
      const thumbnailPath = `${localPath}_${size}`;
      await fs.writeFile(thumbnailPath, thumbnail);
    }),
  );
});

userQueue.process(async (job, done) => {
  const { userId } = job.data;

  if (!userId) {
    return done(new Error('Missing userId'));
  }

  const user = await dbClient.db
    .collection('users')
    .findOne({ _id: ObjectId(userId) });

  if (!user) {
    return done(new Error('User not found'));
  }

  console.log(`Welcome ${user.email}!`);

  done();

  return null;
});

fileQueue.on('failed', (job, err) => {
  console.log(`Job failed with error ${err.message}`);
});

userQueue.on('failed', (job, err) => {
  console.log(`Job failed with error ${err.message}`);
});
