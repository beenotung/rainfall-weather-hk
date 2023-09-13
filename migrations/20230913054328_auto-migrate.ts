import { Knex } from "knex";


export async function up(knex: Knex): Promise<void> {

  if (!(await knex.schema.hasTable('date'))) {
    await knex.schema.createTable('date', table => {
      table.increments('id')
      table.integer('year').notNullable()
      table.integer('month').notNullable()
      table.integer('day').notNullable()
      table.integer('week_day').notNullable()
      table.timestamps(false, true)
    })
  }

  if (!(await knex.schema.hasTable('district'))) {
    await knex.schema.createTable('district', table => {
      table.increments('id')
      table.text('name').notNullable()
      table.timestamps(false, true)
    })
  }

  if (!(await knex.schema.hasTable('time'))) {
    await knex.schema.createTable('time', table => {
      table.increments('id')
      table.integer('hour').notNullable()
      table.integer('minute').notNullable()
      table.timestamps(false, true)
    })
  }

  if (!(await knex.schema.hasTable('rainfall'))) {
    await knex.schema.createTable('rainfall', table => {
      table.increments('id')
      table.integer('date_id').unsigned().notNullable().references('date.id')
      table.integer('time_id').unsigned().notNullable().references('time.id')
      table.integer('district_id').unsigned().notNullable().references('district.id')
      table.timestamps(false, true)
    })
  }
}


export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('rainfall')
  await knex.schema.dropTableIfExists('time')
  await knex.schema.dropTableIfExists('district')
  await knex.schema.dropTableIfExists('date')
}
