import { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('rainfall', table => {
    table.unique(['date_id', 'time_id', 'district_id'])
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('rainfall', table => {
    table.dropUnique(['date_id', 'time_id', 'district_id'])
  })
}
