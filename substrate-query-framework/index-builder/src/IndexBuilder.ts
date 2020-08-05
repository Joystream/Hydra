// @ts-check

import { getRepository, getConnection } from 'typeorm';
import * as BN from 'bn.js';

import {
  QueryBlockProducer,
  QueryEventProcessingPack,
  QueryEventBlock,
  ISubstrateQueryService,
  SavedEntityEvent,
  makeDatabaseManager,
  QueryEvent,
} from '.';

const debug = require('debug')('index-builder:indexer');

export default class IndexBuilder {
  private _producer: QueryBlockProducer;

  private _processing_pack!: QueryEventProcessingPack;

  private lastProcessedEvent!: SavedEntityEvent;

  private constructor(producer: QueryBlockProducer, processing_pack: QueryEventProcessingPack) {
    this._producer = producer;
    this._processing_pack = processing_pack;
  }

  static create(service: ISubstrateQueryService, processing_pack: QueryEventProcessingPack): IndexBuilder {
    const producer = new QueryBlockProducer(service);

    return new IndexBuilder(producer, processing_pack);
  }

  async start(atBlock?: BN) {
    // check state

    // STORE THIS SOMEWHERE
    this._producer.on('QueryEventBlock', (query_event_block: QueryEventBlock): void => {
      this._onQueryEventBlock(query_event_block);
    });

    debug('Spawned worker.');

    if (atBlock) {
      debug(`Got block height hint: ${atBlock}`);
    }
    
    const lastProcessedEvent = await getRepository(SavedEntityEvent).findOne({ where: { id: 1 } });

    if (lastProcessedEvent) {
      debug(`Found the most recent processed event at block ${lastProcessedEvent.blockNumber.toString()}`);
    }

    if (atBlock && lastProcessedEvent) {
      debug(
        `WARNING! Existing processed history detected on the database!
        Last processed block is ${lastProcessedEvent.blockNumber.toString()}. The indexer 
        will continue from block ${lastProcessedEvent.blockNumber.toString()} and ignore the block height hints.`
      );
    }

    if (lastProcessedEvent) {
      this.lastProcessedEvent = lastProcessedEvent;
      await this._producer.start(this.lastProcessedEvent.blockNumber, this.lastProcessedEvent.index);
    } else {
      // Setup worker
      await this._producer.start(atBlock);
    }

    debug('Started worker.');
  }

  async stop() {}

  _onQueryEventBlock(query_event_block: QueryEventBlock): void {
    debug(`Yay, block producer at height: #${query_event_block.block_number}`);

    asyncForEach(query_event_block.query_events, async (query_event: QueryEvent) => {
      
      debug(`Processing event ${query_event.event_name}`)
      query_event.log(0, debug);
  

      const queryRunner = getConnection().createQueryRunner();
      try {
        // establish real database connection
        await queryRunner.connect();
        await queryRunner.startTransaction();

        // Call event handler
        if (this._processing_pack[query_event.event_method]) {
          debug(`Recognized: ` + query_event.event_name);
          await this._processing_pack[query_event.event_method](makeDatabaseManager(queryRunner.manager), query_event);
        } else {
          debug(`No mapping for  ${query_event.event_name}, skipping`);
        }
        // Update last processed event
        await SavedEntityEvent.update(query_event, queryRunner.manager);

        await queryRunner.commitTransaction();
      } catch (error) {
        debug(`There are errors. Rolling back the transaction. Reason: ${error.message}`);

        // Since we have errors lets rollback changes we made
        await queryRunner.rollbackTransaction();
        throw new Error(error);
      } finally {
        // Query runner needs to be released manually.
        await queryRunner.release();
      }
      
    });
  }
}

async function asyncForEach(array: Array<any>, callback: Function) {
  for (let index = 0; index < array.length; index++) {
    await callback(array[index], index, array);
  }
}
