/**
 * MTKruto Server
 * Copyright (C) 2024 Roj <https://roj.im/>
 *
 * This file is part of MTKruto Server.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import { ComponentChildren } from "preact";
import { renderToString } from "preact-render-to-string";
import type { NetworkStatistics, User } from "mtkruto/mod.ts";

import type { WorkerStats } from "./worker.ts";
import type { ClientStats } from "./client_manager.ts";

const startTime = Date.now();

function NewLine() {
  return <>{"\n"}</>;
}
function BlankLine() {
  return (
    <>
      <NewLine />
      <NewLine />
    </>
  );
}
function Bool({ children: value }: { children: boolean }) {
  return <>{value ? "Yes" : "No"}</>;
}

function Field(
  { name, children: value }: { name: string; children?: ComponentChildren },
) {
  return (
    <>
      {name}: {value}
      <NewLine />
    </>
  );
}

function Section(
  { title, children }: { title: string; children?: ComponentChildren },
) {
  return (
    <>
      {title}
      <NewLine />
      <Indent>
        {children}
      </Indent>
    </>
  );
}

function User({ children: user }: { children: User }) {
  return (
    <Section title="User">
      <Field name="ID">{user.id}</Field>

      {user.username && <Field name="Username">@{user.username}</Field>}
      <Field name="Bot">
        <Bool>{user.isBot}</Bool>
      </Field>
      <Field name="First Name">{user.firstName}</Field>
      {user.lastName && <Field name="Last Name">{user.lastName}</Field>}
    </Section>
  );
}

function NetworkStats({ children: stats }: { children: NetworkStatistics }) {
  return (
    <>
      <Section title="Messages">
        <Field name="Up">{stats.messages.sent}</Field>
        <Field name="Down">{stats.messages.received}</Field>
      </Section>
      <BlankLine />
      <Section title="CDN">
        <Field name="Up">{stats.cdn.sent}</Field>
        <Field name="Down">{stats.cdn.received}</Field>
      </Section>
    </>
  );
}

function Indent({ children }: { children?: ComponentChildren }) {
  const v = renderToString(<>{children}</>);
  return (
    <>
      {v.split("\n").map((v) => `    ${v}`).map((v) =>
        v.trim().length == 0 ? "" : v
      ).join("\n")}
    </>
  );
}

function ClientStats({ children: v }: { children: ClientStats }) {
  return (
    <>
      <User>{v.me}</User>
      <BlankLine />
      <NetworkStats>{v.network}</NetworkStats>
    </>
  );
}

export function WorkerStats({ children: v }: { children: WorkerStats }) {
  return (
    <>
      <Field name="Clients">{v.clientCount}</Field>
      <BlankLine />
      {v.clients
        .map((v) => (
          <Indent>
            <ClientStats>{v}</ClientStats>
          </Indent>
        ))
        .map((v, i) => (
          <>
            <Section title={`Client ${i + 1}`}>{v}</Section>
            <BlankLine />
          </>
        ))}
    </>
  );
}

function MemoryStats() {
  const memoryInfo = Deno.systemMemoryInfo();
  const total = Math.ceil(memoryInfo.total / 1024 / 1024);
  const free = Math.ceil(memoryInfo.available / 1024);

  const used = total - free;
  const thisProcess = Math.ceil(Deno.memoryUsage().rss / 1024 / 1024);

  const uptime = `${(Date.now() - startTime) / 1_000 / 60 / 60}h`;
  const totalMemory = `${total} MB`;
  const totalMemoryUsed = `${used} MB`;
  const memoryUsed = `${thisProcess} MB (${
    Math.round(thisProcess / total * 100)
  }% of total, ${Math.round(thisProcess / used * 100)}% of used)`;

  return (
    <>
      <Field name="Uptime">{uptime}</Field>
      <Field name="Total Memory">{totalMemory}</Field>
      <Field name="Total Memory Used">{totalMemoryUsed}</Field>
      <Field name="Memory Used">{memoryUsed}</Field>
    </>
  );
}

function Hr() {
  return <>{"-".repeat(50)}</>;
}

function Stats({ children: workers }: { children: WorkerStats[] }) {
  return (
    <>
      <MemoryStats />
      <Field name="Workers">{workers.length}</Field>
      <BlankLine />
      {workers
        .map((v, i) => (
          <Section title={`Worker ${i + 1}`}>
            <WorkerStats>{v}</WorkerStats>
          </Section>
        ))
        .map((v) => (
          <>
            <BlankLine />
            {v}
            <BlankLine />
            <Hr />
          </>
        ))}
    </>
  );
}

export function displayStats(workers: WorkerStats[]) {
  return renderToString(<Stats>{workers}</Stats>);
}
