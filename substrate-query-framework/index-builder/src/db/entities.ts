import { Entity, Column, EntityManager, PrimaryGeneratedColumn } from 'typeorm';
import { SubstrateEvent } from '..';

/**
 * Represents the last processed event. Corresponding database table will hold only one record
 *  and the single record will be updated
 */
@Entity()
export class SavedEntityEvent {
  @PrimaryGeneratedColumn()
  id!: number;

  // Index of the event. @polkadot/types/interfaces/EventId
  @Column()
  index!: number;

  // The actually event name without event section. Event.method
  @Column()
  eventName!: string;

  // Block number. Event emitted from this block.
  @Column()
  blockNumber!: number;

  // When the event is added to the database
  @Column('timestamp without time zone', {
    default: () => 'now()',
  })
  updatedAt!: Date;

  constructor(init?: Partial<SavedEntityEvent>) {
    Object.assign(this, init);
  }

  /**
   * Get the single database record or create a new instance and then update entity properties
   * with the event parameter
   * @param event
   */
  static async update(event: SubstrateEvent, manager: EntityManager): Promise<void> {
    let lastProcessedEvent = await manager.findOne(SavedEntityEvent, { where: { id: 1 } });

    if (!lastProcessedEvent) {
      lastProcessedEvent = new SavedEntityEvent();
    }

    lastProcessedEvent.index = event.index;
    lastProcessedEvent.eventName = event.event_method;
    lastProcessedEvent.blockNumber = event.block_number;
    lastProcessedEvent.updatedAt = new Date();

    await manager.save(lastProcessedEvent);
  }
}
