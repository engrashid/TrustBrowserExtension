import * as shell from "shelljs";

shell.cp("-R", "css", "dist/");
shell.cp("-R", "fonts", "dist/");
shell.cp("-R", "img", "dist/");
shell.cp("-R", "lib", "dist/");
// shell.cp("-R", "js", "dist/");
shell.cp("-R", "typings", "dist/");
shell.cp("*.json", "dist/");
shell.cp("*.html", "dist/");
shell.cp("README.md", "dist/");