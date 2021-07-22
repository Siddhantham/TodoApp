const express = require("express");
const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const { format } = require("date-fns");
const app = express();

app.use(express.json());

const dbPath = path.join(__dirname, "todoApplication.db");

let db = null;

const initializeDbAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server is running...........");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};

initializeDbAndServer();

const hasStatusProperty = (requestQuery) => {
  return requestQuery.status !== undefined;
};

const hasPriorityProperty = (requestQuery) => {
  return requestQuery.priority !== undefined;
};

const hasPriorityAndStatusQuery = (requestQuery) => {
  return (
    requestQuery.priority !== undefined && requestQuery.status !== undefined
  );
};

const hasCategoryAndStatusQuery = (requestQuery) => {
  return (
    requestQuery.category !== undefined && requestQuery.status !== undefined
  );
};

const hasCategoryQuery = (requestQuery) => {
  return requestQuery.category !== undefined;
};

const hasCategoryAndPriorityQuery = (requestQuery) => {
  return (
    requestQuery.category !== undefined && requestQuery.priority !== undefined
  );
};

const convertToObj = (list) => {
  return {
    id: list.id,
    todo: list.todo,
    priority: list.priority,
    status: list.status,
    category: list.category,
    dueDate: list.due_date,
  };
};
app.get("/todos/", async (request, response) => {
  let data = null;
  let getTodoQuery = "";

  const { search_q = "", priority, status, category } = request.query;
  switch (true) {
    case hasPriorityAndStatusQuery(request.query):
      getTodoQuery = `
      SELECT
        *
      FROM
        todo 
      WHERE 
        todo LIKE '%${search_q}%'
        AND status = '${status}'
        AND priority = '${priority}'
        ;`;
      data = await db.all(getTodoQuery);
      if (priority === "HIGH" || priority === "MEDIUM" || priority === "LOW") {
        if (
          status === "TO DO" ||
          status === "IN PROGRESS" ||
          status === "DONE"
        ) {
          response.send(data.map((each) => convertToObj(each)));
        } else {
          response.status(400);
          response.send("Invalid Todo Status");
        }
      } else {
        response.status(400);
        response.send("Invalid Todo Priority");
      }

      break;
    case hasPriorityProperty(request.query):
      getTodoQuery = `
      SELECT
        *
      FROM
        todo 
      WHERE
        todo LIKE '%${search_q}%'
        AND priority = '${priority}';`;
      data = await db.all(getTodoQuery);
      if (priority === "HIGH" || priority === "MEDIUM" || priority === "LOW") {
        response.send(data.map((each) => convertToObj(each)));
      } else {
        response.status(400);
        response.send("Invalid Todo Priority");
      }
      break;
    case hasStatusProperty(request.query):
      getTodoQuery = `
      SELECT
        *
      FROM
        todo 
      WHERE
        todo LIKE '%${search_q}%'
        AND status = '${status}';`;
      data = await db.all(getTodoQuery);
      if (status === "TO DO" || status === "IN PROGRESS" || status === "DONE") {
        response.send(data.map((each) => convertToObj(each)));
      } else {
        response.status(400);
        response.send("Invalid Todo Status");
      }
      break;
    case hasCategoryQuery(request.query):
      getTodoQuery = `
        SELECT *
        FROM
        todo
        WHERE 
        todo LIKE '%${search_q}%'
        AND category = '${category}';`;
      data = await db.all(getTodoQuery);
      if (
        category === "WORK" ||
        category === "HOME" ||
        category === "LEARNING"
      ) {
        response.send(data.map((each) => convertToObj(each)));
      } else {
        response.status(400);
        response.send("Invalid Todo Category");
      }

      break;
    case hasCategoryAndPriorityQuery(request.query):
      let a1 = category;

      if (a1 === "WORK" || a1 === "HOME" || a1 === "LEARNING") {
        if (
          priority === "HIGH" ||
          priority === "LOW" ||
          priority === "MEDIUM"
        ) {
          getTodoQuery = `
        SELECT *
        FROM
        todo
        WHERE 
        todo LIKE '%${search_q}%'
        AND category = '${a1}'
        AND priority = '${priority}';`;
          data = await db.all(getTodoQuery);
          response.send(data.map((each) => convertToObj(each)));
        } else {
          response.status(400);
          response.send("Invalid Todo Priority");
        }
      } else {
        response.status(400);
        response.send("Invalid Todo Category");
      }

      break;
    case hasCategoryAndStatusQuery(request.query):
      if (
        category === "WORK" ||
        category === "HOME" ||
        category === "LEARNING"
      ) {
        if (
          status === "TO DO" ||
          status === "IN PROGRESS" ||
          status === "DONE"
        ) {
          getTodoQuery = `
        SELECT *
        FROM
        todo
        WHERE 
        todo LIKE '%${search_q}%'
        AND category = '${category}'
        AND status = '${status}';`;
          data = await db.all(getTodoQuery);
          response.send(data.map((each) => convertToObj(each)));
        } else {
          response.status(400);
          response.send("Invalid Todo Status");
        }
      } else {
        response.status(400);
        response.send("Invalid Todo Category");
      }

      break;

    default:
      getTodoQuery = `
      SELECT
        *
      FROM
        todo 
      WHERE
        todo LIKE '%${search_q}%';`;
      data = await db.all(getTodoQuery);
      response.send(data.map((each) => convertToObj(each)));
  }
});

app.get("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const getTodoQuery = `SELECT * FROM todo WHERE id = ${todoId};`;
  const todo = await db.get(getTodoQuery);
  response.send(convertToObj(todo));
});

app.get("/agenda/", async (request, response) => {
  try {
    const { date } = request.query;

    const d = format(new Date(date), "yyyy-MM-dd");
    const g = format(new Date(date), "yyyy-M-dd");
    const getTodoQuery = `SELECT * FROM todo WHERE due_date = '${d}';`;
    const todo = await db.all(getTodoQuery);
    response.send(todo.map((each) => convertToObj(each)));
  } catch {
    response.status(400);
    response.send("Invalid Due Date");
  }
});

app.post("/todos/", async (request, response) => {
  try {
    const { id, todo, priority, status, category, dueDate } = request.body;
    const requestBody = request.body;

    const d = format(new Date(dueDate), "yyyy-MM-dd");
    const createTodoQuery = `INSERT INTO todo (id, todo, priority, status, category, due_date)
    VALUES (${id},'${todo}','${priority}','${status}','${category}', '${d}');`;
    if (status === "TO DO" || status === "IN PROGRESS" || status === "DONE") {
      if (priority === "HIGH" || priority === "LOW" || priority === "MEDIUM") {
        if (
          category === "WORK" ||
          category === "HOME" ||
          category === "LEARNING"
        ) {
          await db.run(createTodoQuery);
          response.send("Todo Successfully Added");
        } else {
          response.status(400);
          response.send("Invalid Todo Category");
        }
      } else {
        response.status(400);
        response.send("Invalid Todo Priority");
      }
    } else {
      response.status(400);
      response.send("Invalid Todo Status");
    }
  } catch {
    response.status(400);
    response.send("Invalid Due Date");
  }
});

app.put("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const request1 = request.body;
  let updateText = "";
  const previousTodoQuery = `
  SELECT *
  FROM todo WHERE id = ${todoId};`;
  const PreviousTodo = await db.get(previousTodoQuery);

  const {
    todo = PreviousTodo.todo,
    status = PreviousTodo.status,
    category = PreviousTodo.category,
    priority = PreviousTodo.priority,
    dueDate = PreviousTodo.due_Date,
  } = request.body;

  const updateQuery = `
  UPDATE todo set 
     todo='${todo}',
     category='${category}',
     status='${status}',
     priority='${priority}',
     due_date='${dueDate}'
  WHERE id = ${todoId};`;
  switch (true) {
    case request1.status !== undefined:
      let a = request1.status;
      if (a === "TO DO" || a === "IN PROGRESS" || a === "WORK") {
        updateText = "Status";
        await db.run(updateQuery);
        response.send(`${updateText} Updated`);
      } else {
        response.status(400);
        response.send("Invalid Todo Status");
      }
      break;
    case request1.priority !== undefined:
      let ak = request1.priority;
      if (ak === "HIGH" || ak === "MEDIUM" || ak === "LOW") {
        updateText = "Priority";
        await db.run(updateQuery);
        response.send(`${updateText} Updated`);
      } else {
        response.status(400);
        response.send("Invalid Todo Priority");
      }
      break;
    case request1.todo !== undefined:
      updateText = "Todo";
      await db.run(updateQuery);
      response.send(`${updateText} Updated`);

      break;
    case request1.category !== undefined:
      let ai = request1.category;
      if (ai === "WORK" || ai === "HOME" || ai === "LEARNING") {
        updateText = "Category";
        await db.run(updateQuery);
        response.send(`${updateText} Updated`);
      } else {
        response.status(400);
        response.send("Invalid Todo Category");
      }
      break;
    case request1.dueDate !== undefined:
      try {
        const previousTodoQuery1 = `
  SELECT *
  FROM todo WHERE id = ${todoId};`;
        const PreviousTodo1 = await db.get(previousTodoQuery1);

        const {
          todo = PreviousTodo1.todo,
          status = PreviousTodo1.status,
          category = PreviousTodo1.category,
          priority = PreviousTodo1.priority,
          dueDate = PreviousTodo1.due_Date,
        } = request.body;

        const r = format(new Date(dueDate), "yyyy-MM-dd");

        const updateQuery1 = `
  UPDATE todo set 
     todo='${todo}',
     category='${category}',
     status='${status}',
     priority='${priority}',
     due_date='${r}'
  WHERE id = ${todoId};`;
        updateText = "Due Date";
        await db.run(updateQuery1);
        response.send(`${updateText} Updated`);
      } catch {
        response.status(400);
        response.send("Invalid Due Date");
      }

      break;
  }
});

app.delete("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const deleteTodoQuery = `DELETE FROM todo WHERE id = ${todoId};`;
  await db.run(deleteTodoQuery);
  response.send("Todo Deleted");
});
module.exports = app;
