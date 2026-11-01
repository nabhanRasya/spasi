/// <reference path="../pb_data/types.d.ts" />
/* Skema awal Spasi: users (tambahan field), posts, drafts, likes, saves, reads, comments, media, reports.
   Aturan akses mengikuti "Arsitektur Backend Spasi (PocketBase)", bagian "Aturan akses".
   Bentuk migrasi mengikuti dokumentasi PocketBase (migrate((app) => …), new Collection, app.save). */
migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('users');

    // ---------- users: aturan + field tambahan ----------
    users.listRule = 'id = @request.auth.id';
    users.viewRule = 'id = @request.auth.id';
    users.createRule = '';
    users.updateRule = 'id = @request.auth.id';
    users.deleteRule = 'id = @request.auth.id';
    const nameField = users.fields.getByName('name');
    if (nameField) nameField.max = 30;
    const pwField = users.fields.getByName('password');
    if (pwField) pwField.min = 8; // sama dengan validasi klien (core/account.js)
    users.fields.add(new TextField({ name: 'pen_name', max: 30 }));
    users.fields.add(new BoolField({ name: 'anon_default' }));
    users.fields.add(new BoolField({ name: 'welcome_done' }));
    app.save(users);

    const created = { type: 'autodate', name: 'created', onCreate: true, onUpdate: false };
    const updated = { type: 'autodate', name: 'updated', onCreate: true, onUpdate: true };
    const rel = (name, collectionId, extra) =>
      Object.assign({ type: 'relation', name, collectionId, maxSelect: 1, cascadeDelete: true, required: true }, extra || {});

    // ---------- posts ----------
    const posts = new Collection({
      type: 'base',
      name: 'posts',
      listRule: '',
      viewRule: '',
      createRule:
        '@request.auth.id != "" && @request.body.author = @request.auth.id' +
        ' && @request.body.featured:isset = false' +
        ' && @request.body.like_count:isset = false' +
        ' && @request.body.comment_count:isset = false' +
        ' && @request.body.words:isset = false',
      updateRule:
        'author = @request.auth.id' +
        ' && @request.body.author:isset = false' +
        ' && @request.body.slug:isset = false' +
        ' && @request.body.featured:isset = false' +
        ' && @request.body.like_count:isset = false' +
        ' && @request.body.comment_count:isset = false' +
        ' && @request.body.words:isset = false',
      deleteRule: 'author = @request.auth.id',
      fields: [
        { type: 'text', name: 'slug', required: true, max: 80, pattern: '^[a-z0-9]+(-[a-z0-9]+)*$' },
        rel('author', users.id),
        { type: 'text', name: 'author_name', max: 30 },
        { type: 'bool', name: 'anon' },
        { type: 'text', name: 'title', required: true, min: 3, max: 120 },
        { type: 'text', name: 'tag', max: 24, pattern: '^[a-z0-9-]*$' },
        { type: 'text', name: 'excerpt', max: 300 },
        { type: 'editor', name: 'body', required: true, maxSize: 400000, convertURLs: false },
        { type: 'number', name: 'words', onlyInt: true, min: 0 },
        { type: 'bool', name: 'featured' },
        { type: 'number', name: 'like_count', onlyInt: true, min: 0 },
        { type: 'number', name: 'comment_count', onlyInt: true, min: 0 },
        { type: 'date', name: 'published_at' },
        created,
        updated
      ],
      indexes: [
        'CREATE UNIQUE INDEX idx_posts_slug ON posts (slug)',
        'CREATE INDEX idx_posts_published ON posts (published_at DESC)',
        'CREATE INDEX idx_posts_tag ON posts (tag, published_at DESC)',
        'CREATE INDEX idx_posts_author ON posts (author, published_at DESC)'
      ]
    });
    app.save(posts);

    // ---------- drafts ----------
    app.save(
      new Collection({
        type: 'base',
        name: 'drafts',
        listRule: 'owner = @request.auth.id',
        viewRule: 'owner = @request.auth.id',
        createRule: '@request.auth.id != "" && @request.body.owner = @request.auth.id',
        updateRule: 'owner = @request.auth.id && @request.body.owner:isset = false',
        deleteRule: 'owner = @request.auth.id',
        fields: [
          rel('owner', users.id),
          { type: 'text', name: 'client_id', required: true, max: 40 },
          rel('source_post', posts.id, { required: false, cascadeDelete: false }),
          { type: 'text', name: 'title', max: 200 },
          { type: 'editor', name: 'body', maxSize: 600000, convertURLs: false },
          { type: 'text', name: 'tag', max: 40 },
          { type: 'text', name: 'excerpt', max: 400 },
          created,
          updated
        ],
        indexes: [
          'CREATE UNIQUE INDEX idx_drafts_owner_client ON drafts (owner, client_id)',
          'CREATE INDEX idx_drafts_owner_updated ON drafts (owner, updated DESC)'
        ]
      })
    );

    // ---------- likes, saves, reads ----------
    const mark = (name, deletable, extraFields) =>
      new Collection({
        type: 'base',
        name,
        listRule: 'user = @request.auth.id',
        viewRule: 'user = @request.auth.id',
        createRule: '@request.auth.id != "" && @request.body.user = @request.auth.id',
        updateRule: null,
        deleteRule: deletable ? 'user = @request.auth.id' : null,
        fields: [rel('user', users.id), rel('post', posts.id)].concat(extraFields || []),
        indexes: [
          'CREATE UNIQUE INDEX idx_' + name + '_user_post ON ' + name + ' (user, post)',
          'CREATE INDEX idx_' + name + '_post ON ' + name + ' (post)'
        ]
      });
    app.save(mark('likes', true, [created]));
    app.save(mark('saves', true, [created]));
    app.save(mark('reads', false, [created]));

    // ---------- comments ----------
    app.save(
      new Collection({
        type: 'base',
        name: 'comments',
        listRule: 'hidden = false',
        viewRule: 'hidden = false',
        createRule:
          '@request.auth.id != "" && @request.body.author = @request.auth.id' +
          ' && @request.body.hidden:isset = false && @request.body.author_name:isset = false',
        updateRule: null,
        deleteRule: 'author = @request.auth.id || post.author = @request.auth.id',
        fields: [
          rel('post', posts.id),
          rel('author', users.id),
          { type: 'text', name: 'author_name', max: 30 },
          { type: 'text', name: 'body', required: true, min: 2, max: 600 },
          { type: 'bool', name: 'hidden' },
          created
        ],
        indexes: ['CREATE INDEX idx_comments_post ON comments (post, created)']
      })
    );

    // ---------- media ----------
    app.save(
      new Collection({
        type: 'base',
        name: 'media',
        listRule: '',
        viewRule: '',
        createRule: '@request.auth.id != "" && @request.body.owner = @request.auth.id',
        updateRule: null,
        deleteRule: 'owner = @request.auth.id',
        fields: [
          rel('owner', users.id),
          rel('post', posts.id, { required: false }),
          {
            type: 'file',
            name: 'file',
            required: true,
            maxSelect: 1,
            maxSize: 409600,
            mimeTypes: ['image/webp', 'image/jpeg', 'image/png'],
            thumbs: ['640x0', '1280x0'],
            protected: false
          },
          { type: 'text', name: 'alt', max: 200 },
          { type: 'bool', name: 'ai' },
          created
        ],
        indexes: ['CREATE INDEX idx_media_owner ON media (owner, created DESC)']
      })
    );

    // ---------- reports (hanya admin yang membaca) ----------
    const commentsCol = app.findCollectionByNameOrId('comments');
    app.save(
      new Collection({
        type: 'base',
        name: 'reports',
        listRule: null,
        viewRule: null,
        createRule: '@request.auth.id != "" && @request.body.reporter = @request.auth.id',
        updateRule: null,
        deleteRule: null,
        fields: [
          rel('reporter', users.id),
          rel('post', posts.id, { required: false }),
          rel('comment', commentsCol.id, { required: false }),
          { type: 'select', name: 'reason', required: true, maxSelect: 1, values: ['spam', 'pelecehan', 'menyesatkan', 'lainnya'] },
          { type: 'text', name: 'note', max: 300 },
          { type: 'select', name: 'status', maxSelect: 1, values: ['baru', 'diproses', 'selesai'] },
          created
        ]
      })
    );
  },
  (app) => {
    ['reports', 'media', 'comments', 'reads', 'saves', 'likes', 'drafts', 'posts'].forEach((name) => {
      try {
        app.delete(app.findCollectionByNameOrId(name));
      } catch (_) {
        /* sudah tidak ada */
      }
    });
    const users = app.findCollectionByNameOrId('users');
    ['pen_name', 'anon_default', 'welcome_done'].forEach((n) => users.fields.removeByName(n));
    app.save(users);
  }
);
