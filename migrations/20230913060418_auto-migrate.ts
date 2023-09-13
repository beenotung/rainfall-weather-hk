import { Knex } from "knex";


export async function up(knex: Knex): Promise<void> {
  await knex.raw('alter table `rainfall` add column `amount` integer not null')
}


export async function down(knex: Knex): Promise<void> {
  await knex.raw('alter table `rainfall` drop column `amount`')
}
