import { ActionArgs, LoaderArgs, json, redirect } from "@remix-run/node";
import { NewJoke, createJoke } from "~/lib/db.server";
import { z } from "zod";
import { Form, useActionData } from "@remix-run/react";
import { badRequest } from "~/lib/request.server";
import { requireUserId } from "~/lib/session.server";

const jokeSchema = z.object({
  name: z.string().min(3),
  content: z.string().min(10),
});

type JokeForm = z.infer<typeof jokeSchema>;

export const action = async ({ request }: ActionArgs) => {
  const userId = await requireUserId(request, "/jokes/new");
  const form = await request.formData();
  const fields = Object.fromEntries(form) as JokeForm;

  const validationResult = jokeSchema.safeParse(Object.fromEntries(form));

  if (!validationResult.success) {
    const fieldErrors = validationResult.error.flatten().fieldErrors;

    return badRequest({ fieldErrors, fields, formError: null });
  }

  const joke = await createJoke({
    ...validationResult.data,
    jokesterId: userId,
  });
  return redirect(`/jokes/${joke.id}`);
};

export const loader = async ({ request }: LoaderArgs) => {
  await requireUserId(request, "/jokes/new");

  return null;
};

export default function NewJokeRoute() {
  const actionData = useActionData<typeof action>();

  return (
    <div>
      <p>Add your own hilarious joke</p>
      <Form method="post">
        <div>
          <label>
            Name:{" "}
            <input
              type="text"
              name="name"
              defaultValue={actionData?.fields?.name}
              aria-invalid={Boolean(actionData?.fieldErrors?.name?.[0])}
              aria-errormessage={
                actionData?.fieldErrors?.name?.[0] ? "name-error" : undefined
              }
            />
          </label>
          {!!actionData?.fieldErrors?.name?.[0] && (
            <p className="form-validation-error" id="name-error" role="alert">
              {actionData.fieldErrors.name[0]}
            </p>
          )}
        </div>
        <div>
          <label>
            Content:
            <textarea
              name="content"
              defaultValue={actionData?.fields?.content}
              aria-invalid={Boolean(actionData?.fieldErrors?.content?.[0])}
              aria-errormessage={
                actionData?.fieldErrors?.content?.[0]
                  ? "content-error"
                  : undefined
              }
            />
          </label>
          {!!actionData?.fieldErrors?.content?.[0] && (
            <p
              className="form-validation-error"
              id="content-error"
              role="alert"
            >
              {actionData.fieldErrors.content[0]}
            </p>
          )}
        </div>
        <div>
          <button type="submit" className="button">
            Add
          </button>
        </div>
      </Form>
    </div>
  );
}
