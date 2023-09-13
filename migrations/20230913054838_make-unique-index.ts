import { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('district', table => {
    table.unique(['name'])
  })
  await knex.schema.alterTable('time', table => {
    table.unique(['hour', 'minute'])
  })
  await knex.schema.alterTable('date', table => {
    table.unique(['year', 'month', 'day'])
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('district', table => {
    table.dropUnique(['name'])
  })
  await knex.schema.alterTable('time', table => {
    table.dropUnique(['hour', 'minute'])
  })
  await knex.schema.alterTable('date', table => {
    table.dropUnique(['year', 'month', 'day'])
  })
}
