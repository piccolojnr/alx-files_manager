import { ObjectId } from 'mongodb';
import * as fs from 'node:fs/promises';
import path from 'node:path';
import { v4 as uuidv4 } from 'uuid';
import mime from 'mime-types';
import Bull from 'bull';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

const fileQueue = new Bull('fileQueue');

class FilesController {
  static async postLoad(req, res) {
    try {
      const token = req.headers['x-token'];

      if (!token) {
        return res.status(401).send({ error: 'Unauthorized' });
      }

      const key = `auth_${token}`;
      const userId = await redisClient.get(key);

      if (!userId) {
        return res.status(401).send({ error: 'Unauthorized' });
      }

      const {
        name, type, parentId = 0, isPublic = false, data,
      } = req.body;

      if (!name) {
        return res.status(400).json({ error: 'Missing name' });
      }

      const validTypes = ['folder', 'file', 'image'];
      if (!type || !validTypes.includes(type)) {
        return res.status(400).json({ error: 'Missing type' });
      }

      if (parentId !== 0) {
        const parentFile = await dbClient.db
          .collection('files')
          .findOne({ _id: ObjectId(parentId) });
        if (!parentFile) {
          return res.status(400).json({ error: 'Parent not found' });
        }
        if (parentFile.type !== 'folder') {
          return res.status(400).json({ error: 'Parent is not a folder' });
        }
      }

      const fileDocument = {
        userId: ObjectId(userId),
        name,
        type,
        isPublic,
        parentId: parentId === 0 ? 0 : ObjectId(parentId),
      };

      if (type === 'folder') {
        const result = await dbClient.db
          .collection('files')
          .insertOne(fileDocument);
        return res.status(201).json({
          id: result.insertedId,
          userId: fileDocument.userId,
          name,
          type,
          isPublic,
          parentId,
        });
      }

      const folderPath = process.env.FOLDER_PATH || '/tmp/files_manager';

      await fs.mkdir(folderPath, { recursive: true });

      const filePath = path.join(folderPath, uuidv4());

      const buffer = Buffer.from(data, 'base64');

      await fs.writeFile(filePath, buffer);

      fileDocument.localPath = filePath;
      const result = await dbClient.db
        .collection('files')
        .insertOne(fileDocument);

      if (type === 'image') {
        fileQueue.add({
          userId,
          fileId: result.insertedId.toString(),
        });
      }

      return res.status(201).json({
        id: result.insertedId,
        userId: fileDocument.userId,
        name,
        type,
        isPublic,
        parentId,
        localPath: filePath,
      });
    } catch (error) {
      console.log(error);
      return res.status(500).send({ error: 'Server error' });
    }
  }

  static async getShow(req, res) {
    try {
      const token = req.headers['x-token'];

      if (!token) {
        return res.status(401).send({ error: 'Unauthorized' });
      }

      const key = `auth_${token}`;
      const userId = await redisClient.get(key);

      if (!userId) {
        return res.status(401).send({ error: 'Unauthorized' });
      }

      const { id } = req.params;

      const file = await dbClient.db
        .collection('files')
        .findOne({ _id: ObjectId(id), userId: ObjectId(userId) });

      if (!file) {
        return res.status(404).json({ error: 'Not found' });
      }

      return res.status(200).json({
        id: file._id,
        userId: file.userId,
        name: file.name,
        type: file.type,
        isPublic: file.isPublic,
        parentId: file.parentId,
      });
    } catch (error) {
      console.log(error);
      return res.status(500).send({ error: 'Server error' });
    }
  }

  static async getIndex(req, res) {
    try {
      const token = req.headers['x-token'];

      if (!token) {
        return res.status(401).send({ error: 'Unauthorized' });
      }

      const key = `auth_${token}`;
      const userId = await redisClient.get(key);

      if (!userId) {
        return res.status(401).send({ error: 'Unauthorized' });
      }

      const { parentId = '0', page = 0 } = req.query;
      const pageSize = 20;
      const skip = parseInt(page, 10) * pageSize;

      const query = {
        userId: ObjectId(userId),
        parentId: parentId === '0' ? 0 : ObjectId(parentId),
      };

      const files = await dbClient.db
        .collection('files')
        .find(query)
        .skip(skip)
        .limit(pageSize)
        .toArray();

      return res.status(200).json(files);
    } catch (error) {
      console.log(error);
      return res.status(500).send({ error: 'Server error' });
    }
  }

  static async putPublish(req, res) {
    try {
      const token = req.headers['x-token'];

      if (!token) {
        return res.status(401).send({ error: 'Unauthorized' });
      }

      const key = `auth_${token}`;
      const userId = await redisClient.get(key);

      if (!userId) {
        return res.status(401).send({ error: 'Unauthorized' });
      }

      const { id } = req.params;

      const file = await dbClient.db
        .collection('files')
        .findOne({ _id: ObjectId(id), userId: ObjectId(userId) });

      if (!file) {
        return res.status(404).json({ error: 'Not found' });
      }

      await dbClient.db
        .collection('files')
        .updateOne({ _id: ObjectId(id) }, { $set: { isPublic: true } });

      return res.status(200).json({
        id: file._id,
        userId: file.userId,
        name: file.name,
        type: file.type,
        isPublic: true,
        parentId: file.parentId,
      });
    } catch (error) {
      console.log(error);
      return res.status(500).send({ error: 'Server error' });
    }
  }

  static async putUnPublish(req, res) {
    try {
      const token = req.headers['x-token'];

      if (!token) {
        return res.status(401).send({ error: 'Unauthorized' });
      }

      const key = `auth_${token}`;
      const userId = await redisClient.get(key);

      if (!userId) {
        return res.status(401).send({ error: 'Unauthorized' });
      }

      const { id } = req.params;

      const file = await dbClient.db
        .collection('files')
        .findOne({ _id: ObjectId(id), userId: ObjectId(userId) });

      if (!file) {
        return res.status(404).json({ error: 'Not found' });
      }

      await dbClient.db
        .collection('files')
        .updateOne({ _id: ObjectId(id) }, { $set: { isPublic: false } });

      return res.status(200).json({
        id: file._id,
        userId: file.userId,
        name: file.name,
        type: file.type,
        isPublic: false,
        parentId: file.parentId,
      });
    } catch (error) {
      console.log(error);
      return res.status(500).send({ error: 'Server error' });
    }
  }

  static async getFile(req, res) {
    try {
      const { id } = req.params;
      const { size } = req.query;

      // Validate the id parameter
      if (!ObjectId.isValid(id)) {
        return res.status(400).json({ error: 'Invalid ID format' });
      }

      const file = await dbClient.db
        .collection('files')
        .findOne({ _id: ObjectId(id) });

      if (!file) {
        return res.status(404).json({ error: 'Not found' });
      }

      if (!file.isPublic) {
        const token = req.headers['x-token'];

        if (!token) {
          return res.status(404).json({ error: 'Not found' });
        }

        const key = `auth_${token}`;
        const userId = await redisClient.get(key);

        if (!userId) {
          return res.status(404).json({ error: 'Not found' });
        }
      }

      if (file.type === 'folder') {
        return res.status(400).json({ error: "A folder doesn't have content" });
      }

      const fileExists = await fs
        .access(file.localPath)
        .then(() => true)
        .catch(() => false);

      if (!fileExists) {
        return res.status(404).json({ error: 'Not found' });
      }

      let filePath = file.localPath;
      if (size) {
        const validSizes = [100, 250, 500];
        if (!validSizes.includes(parseInt(size, 10))) {
          return res.status(400).json({ error: 'Invalid size parameter' });
        }
        filePath = `${filePath}_${size}`;
      }

      res.setHeader(
        'Content-Type',
        mime.contentType(file.name) || 'text/plain; charset=utf-8',
      );
      return res.status(200).send(await fs.readFile(filePath));
    } catch (error) {
      console.log(error);
      return res.status(500).send({ error: 'Server error' });
    }
  }
}

export default FilesController;
