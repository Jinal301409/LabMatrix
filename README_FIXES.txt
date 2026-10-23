LabMatrix - conflict fixes
==========================
Copy the files into your project at the same paths (replace when asked).

NEW files
  database/fix_conflicts.sql      run once on your EXISTING database (keeps all data)
  database/check_conflicts.sql    optional: lists clashes already in your data

REPLACE files
  backend/utils/crudFactory.js
  backend/routes/booking.routes.js
  backend/routes/session.routes.js
  backend/routes/lab.routes.js
  database/schema.sql             only matters for a fresh setup (it drops the DB!)
  database/seed_large.sql         only if you use the large demo data

STEPS (existing database)
  1. Copy the backend files above into your project.
  2. Run:   mysql -u root -p < database/fix_conflicts.sql
     (or open the file in MySQL Workbench and run it all)
  3. Restart the backend (Ctrl+C, then npm run dev).
  4. Optional: mysql -u root -p < database/check_conflicts.sql
     It should return no rows. Any rows are old clashes to fix or delete by hand.

DO NOT run schema.sql on a database you want to keep: it deletes it.
