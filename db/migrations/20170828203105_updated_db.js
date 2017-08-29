exports.up = function(knex, Promise) {

  return Promise.all([
      knex.schema.createTable('users', (table)=> {
        table.increments('users_id').primary();
        table.string('full_name');
        table.string('email').unique();
        table.string('password_hash');
        table.date('created_at');
        table.text('bio');
      }),

      knex.schema.createTable('subscribers', (table)=>{
        table.increments('sub_id').primary();
        table.integer('subscriber_id')
              .references('users_id')
              .inTable('users');
        table.integer('tag_subscribed_to_id')
              .references('tag_id')
              .inTable('tags');
      }),

      knex.schema.createTable('posts', (table) => {
        table.increments('posts_id').primary();
        table.string('title');
        table.text('content');
        table.string('image_url');
        table.integer('author_id')
              .references('users_id')
              .inTable('users');
        table.date('date_written');
      }),

      knex.schema.createTable('tags', (table) => {
        table.integer('tag_id').primary();
        table.string('tag_name');
        table.integer('article_id')
              .references('posts_id')
              .inTable('posts');
      }),

      knex.schema.createTable('comments', function(table){
        table.increments('comment_id').primary();
        table.text('description');
        table.string('commenter_name');
        table.integer('commenter_id')
              .references('users_id')
              .inTable('users');
        table.integer('article_id')
              .references('posts_id')
              .inTable('posts');
        table.date('date_created');
      })
    ]);
};

exports.down = function(knex, Promise) {
  return Promise.all([
      knex.schema.dropTable('users'),
      knex.schema.dropTable('subscribers'),
      knex.schema.dropTable('posts'),
      knex.schema.dropTable('tags'),
      knex.schema.dropTable('comments')
    ])
};
