import Knex from "knex";

let config = require("./knexfile");

export let knex = Knex(config.development);
