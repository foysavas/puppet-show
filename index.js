const app = require("express")();
const expressPathsAsRoutes = require("express-paths-as-routes");
if (process.env.APP_MOCKAPI) {
  app.use(expressPathsAsRoutes(`${__dirname}/api-mock`));
} else {
  app.use(expressPathsAsRoutes(`${__dirname}/api`));
}

const PORT = process.env.APP_BACKEND_PORT || 2000;
app.listen(PORT, () => {
  console.log(`api running on: http://${process.env.APP_DOMAIN_api_domain}:${PORT}`)
})