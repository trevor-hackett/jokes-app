import { json } from "@remix-run/node";
import { Link, useLoaderData } from "@remix-run/react";
import { randomJoke } from "~/lib/db.server";

export const loader = async () => {
  const [joke] = await randomJoke.execute();
  return json({ joke });
};

export default function JokesIndexRoute() {
  const data = useLoaderData<typeof loader>();

  return (
    <div>
      <p>Here's a random joke:</p>
      <p>{data.joke.content}</p>
      <Link to={String(data.joke.id)}>"{data.joke.name}" Permalink</Link>
    </div>
  );
}
