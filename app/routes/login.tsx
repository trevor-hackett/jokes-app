import type { ActionArgs, LinksFunction } from "@remix-run/node";
import { Form, Link, useActionData, useSearchParams } from "@remix-run/react";
import { z } from "zod";
import { findUserByLogin, registerUser } from "~/lib/db.server";
import { badRequest } from "~/lib/request.server";
import { createUserSession } from "~/lib/session.server";

import stylesUrl from "~/styles/login.css";

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: stylesUrl },
];

const loginSchema = z.object({
  username: z.string().min(3),
  password: z.string().min(6),
  redirectTo: z.string().startsWith("/"),
  loginType: z.enum(["login", "register"]),
});

type LoginForm = z.infer<typeof loginSchema>;

export const action = async ({ request }: ActionArgs) => {
  const form = await request.formData();
  const fields = Object.fromEntries(form) as LoginForm;

  const validationResult = loginSchema.safeParse(fields);

  if (!validationResult.success) {
    const fieldErrors = validationResult.error.flatten().fieldErrors;

    return badRequest({ fieldErrors, fields, formError: null });
  }

  const loginForm = validationResult.data;

  switch (loginForm.loginType) {
    case "login": {
      const user = await findUserByLogin({
        username: loginForm.username,
        password: loginForm.password,
      });

      console.log({ user });

      if (!user) {
        return badRequest({
          fieldErrors: null,
          fields,
          formError: "Username/Password is incorrect",
        });
      }

      return createUserSession(user.id, loginForm.redirectTo);
    }
    case "register": {
      const registerResult = await registerUser({
        username: loginForm.username,
        password: loginForm.password,
      });

      if (registerResult.success === false) {
        return badRequest({
          fieldErrors: null,
          fields,
          formError: registerResult.error,
        });
      }

      return createUserSession(registerResult.user.id, loginForm.redirectTo);
    }
    default: {
      return badRequest({
        fieldErrors: null,
        fields,
        formError: "Login type invalid",
      });
    }
  }
};

export default function Login() {
  const actionData = useActionData<typeof action>();
  const [searchParams] = useSearchParams();

  return (
    <div className="container">
      <div className="content" data-light="">
        <h1>Login</h1>
        <Form method="post">
          <input
            type="hidden"
            name="redirectTo"
            value={searchParams.get("redirectTo") ?? "/"}
          />
          <fieldset>
            <legend className="sr-only">Login or Register?</legend>
            <label>
              <input
                type="radio"
                name="loginType"
                value="login"
                defaultChecked={
                  !actionData?.fields?.loginType ||
                  actionData?.fields?.loginType === "login"
                }
              />{" "}
              Login
            </label>
            <label>
              <input
                type="radio"
                name="loginType"
                value="register"
                defaultChecked={actionData?.fields?.loginType === "register"}
              />{" "}
              Register
            </label>
          </fieldset>
          <div>
            <label htmlFor="username-input">Username</label>
            <input
              type="text"
              id="username-input"
              name="username"
              defaultValue={actionData?.fields?.username}
              aria-invalid={Boolean(actionData?.fieldErrors?.username?.[0])}
              aria-errormessage={
                actionData?.fieldErrors?.username?.[0]
                  ? "username-error"
                  : undefined
              }
            />
            {!!actionData?.fieldErrors?.username?.[0] && (
              <p
                className="form-validation-error"
                role="alert"
                id="username-error"
              >
                {actionData.fieldErrors.username[0]}
              </p>
            )}
          </div>
          <div>
            <label htmlFor="password-input">Password</label>
            <input
              id="password-input"
              name="password"
              type="password"
              defaultValue={actionData?.fields?.password}
              aria-invalid={Boolean(actionData?.fieldErrors?.password?.[0])}
              aria-errormessage={
                actionData?.fieldErrors?.password?.[0]
                  ? "password-error"
                  : undefined
              }
            />
            {!!actionData?.fieldErrors?.password?.[0] && (
              <p
                className="form-validation-error"
                role="alert"
                id="password-error"
              >
                {actionData.fieldErrors.password[0]}
              </p>
            )}
          </div>
          {!!actionData?.formError && (
            <div id="form-error-message">
              <p className="form-validation-error" role="alert">
                {actionData.formError}
              </p>
            </div>
          )}
          <button type="submit" className="button">
            Submit
          </button>
        </Form>
      </div>
      <div className="links">
        <ul>
          <li>
            <Link to="/">Home</Link>
          </li>
          <li>
            <Link to="/jokes">Jokes</Link>
          </li>
        </ul>
      </div>
    </div>
  );
}
