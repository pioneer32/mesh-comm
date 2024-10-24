# MeshComm

MeshComm is a lightweight JavaScript library that enables micro-frontends or modules to communicate within a single browser window using messages. Utilizing the `window.postMessage` API as its underlying transport mechanism, MeshComm
enables
message-based communication without requiring external dependencies. It supports both broadcast-style messages and request-response messaging between nodes, including optional exclusive listener patterns.

## Concept Overview

MeshComm provides decentralized **networks**, each identified by a unique name and always available for direct access. Within each network, **endpoints** are automatically created when **nodes** are added at runtime, serving as targets for
handling **messages**.

MeshComm supports two types of communication:

- **Broadcast Messages**: Send messages to all nodes or filter them using patterns (e.g., wildcards like \*).
- **Request-Response Messages**: Send requests to specific nodes and expect a response (for each request, only one node will send a response, even if multiple nodes can handle the message).

Nodes can be marked as **exclusive**, meaning only one node can occupy a specific endpoint, ensuring no conflicts. In contrast, **non-exclusive** nodes can share the same endpoint, allowing multiple nodes to coexist at the same
endpoints.

Messages can be **broadcast**, reaching all nodes that match a specific pattern, or sent as **request-response pairs**, where replies are expected from a particular node. This flexibility makes MeshComm ideal for a wide range of use
cases, especially in micro-frontend architectures.

## Features

- **Broadcast Messages**: Send messages to all nodes or filter them using patterns (e.g., wildcards like \*).
- **Request-Response Messages**: Send requests to specific nodes and expect a response (for each request, only one node will send a response, even if multiple nodes can handle the message).
- **Exclusive Listeners**: Prevent multiple nodes from handling the same endpoint simultaneously.
- **Abortable Requests**: Set timeouts or abort requests using AbortController.
- **Singleton Mesh Instances**: Access multiple instances of mesh networks, each identified by a unique name.
- **Same-Origin Security**: Ensures that communication between the sender and recipient is restricted to the same origin.

## Installation

You can install MeshComm via npm:

```bash
npm install mesh-comm
```

or yarn:

```bash
yarn add mesh-comm
```

## Basic Usage

## Accessing a Mesh Network

MeshComm allows you to have multiple mesh networks simultaneously. Each network is identified by a unique name. Networks exist by default, and you simply retrieve a reference to them.

```typescript
import MeshComm from 'mesh-comm';

// Get a reference to the mesh instance by name
const mesh = MeshComm('my-mesh');
```

### Adding Nodes

You can add nodes to the mesh that can either handle broadcast messages or participate in request-response patterns.

#### Example 1: Exclusive Node

```typescript
// Node 1
mesh.add(
  '/authenticator',
  async (msg: { type: string }) => {
    switch (msg.type) {
      case 'GET_ACCESS_TOKEN':
      // return the access token, if any
      case 'IS_USER_LOGGED_IN':
      // return whether the user is logged in
    }
  },
  { exclusive: true } // No other node can share this endpoint
);
```

#### Example 2: Non-Exclusive Nodes

```typescript
// Node 2
mesh.add('/storage/messages', async (msg: { type: 'GET_UNREAD_MESSAGE_COUNT' } | { type: 'USER_AUTHENTICATED'; authenticated: boolean }) => {
  switch (msg.type) {
    case 'GET_UNREAD_MESSAGE_COUNT': {
      // return unread message count
      break;
    }
    case 'USER_AUTHENTICATED': {
      // probably, clean cache if the user isn't authenticated any longer
      // or, eagerly load the number of unread messages if the user is now logged in
    }
    case 'RESET': {
      // just clean cache
    }
  }
});

// Node 3
mesh.add('/storage/messages', async (msg: { type: 'GET_MESSAGE'; id: number }, options?: RequestOptions) => {
  switch (msg.type) {
    case 'GET_MESSAGE': {
      const token = await mesh.request('/authenticator', { type: 'GET_ACCESS_TOKEN' }); // this is exclusively proccessed by Node 1
      // now let's make a request to the API to get the message
      break;
    }
    case 'USER_AUTHENTICATED': {
      // probably, clean cache if the user isn't authenticated any longer
    }
    case 'RESET': {
      // just clean cache
    }
  }
});
```

### Sending Messages

You can send broadcast messages to all nodes or select specific patterns.

#### Broadcast to All Nodes

```typescript
mesh.send('/*', { type: 'USER_AUTHENTICATED', authenticated: true }); // this will be delivered to all 3 nodes
mesh.send('/storage/*', { type: 'RESET' }); // this will be delivered to Node 2 and Node 3 only
```

#### Request-Response

Request a response from a specific node. You can also provide an abort signal or timeout.

```typescript
const message = await mesh.request('/storage/messages', { type: 'GET_MESSAGE', id: 123 }); // though this is delivered to both Node 2 and Node 3, only Node 3 will process and respond.
```

### Handling Timeouts

Sending broadcast messages, we aren't concerned whether there is any node. However, when it comes to sending request-response messages, there are cases when the node(s) is(are) not added yet to the endpoint.
This is addressed with a timeout, which default value is 5000ms, which works this way:

```typescript
// one of the nodes attempts to send a request-response message:
try {
  const message = await mesh.request('/storage/messages', { type: 'GET_MESSAGE', id: 123 }, { timeout: 5_000 });

  // The following process occurs behind the scenes:
  //
  // 1. The mesh checks if any nodes are registered at the target endpoint:
  //   - If yes, the message is sent to those nodes (note: this does not guarantee that any node is interested in this request).
  //   - If no, It waits for up to 5000ms for a node to register at the endpoint.

  // 2. If a response is received within 5000ms, the promise resolves successfully.

  // 3. If no response is received within 5000ms, the promise is rejected. This could happen for two reasons:
  //   - (a) There are nodes at the endpoint, but none are able to process the request.
  //   - (b) Processing the request is taking longer than 5000ms.

  // 4. If no nodes are added to the endpoint within 5000ms, the promise is also rejected.
} catch (error) {
  if (error instanceof MeshTimeoutError /* or, alternatively, error.name === 'MeshTimeoutError' */) {
    // Processing the request took longer than 5000ms or no node, at the target endpoint, could process it (3)
  }
  if (error instanceof MeshNoNodeError /* or, alternatively, error.name === 'MeshNoNodeError' */) {
    // No node registered at the target endpoint within 5000ms
  }
}
```

### Handling Abort

Abortable Requests are particularly useful in user-driven interfaces where operations may need to be canceled due to timeouts or user action (this highlights a practical use case). You can use `AbortController` to abort requests.

```typescript
const abortCtrl = new AbortController();

// Abort request if the user clicks button
const onButtonClick = () => {
  abortCtrl.abort();
};

try {
  const user = await mesh.request('/storage/users', { type: 'GET_USER', id: 123 }, { signal: abortCtrl.signal, timeout: 5_000 });
} catch (error) {
  if (error.name === 'AbortError') {
    console.log('Request aborted');
  }
  if (error.name === 'MeshTimeoutError') {
    console.error('Request timed out');
  }
}
```

## Debugging

If you need to debug communications between nodes, `mesh-comm` provides an easy way to see all message exchanges in the console.

To enable logging, simply add into your script:

```typescript
MeshComm.logger.enable();
```

This will echo all communication between nodes to the console, which can be useful for tracking messages, requests, and responses during development.

## Security Considerations

MeshComm leverages the `window.postMessage` API for communication, which ensures that messages can only be transmitted within the same window object. Currently, the library does not support communication across multiple window instances or
between different iframes. All message sending and receiving is confined to the same window context.

Additionally, MeshComm enforces same-origin policies to ensure secure communication. This means that both the sender and the recipient of a message must be from the same origin (i.e., they share the same protocol, domain, and port). This
built-in security feature ensures that malicious scripts or unauthorized third parties cannot intercept or send messages between different origins, providing an extra layer of security.

### Key Points:

- Communication is restricted to within a single window instance.
- No support for cross-window or cross-iframe messaging.
- Enforces same-origin communication to prevent unauthorized message interception or sending.

## Playground

Please see [packages/example](packages/example)

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
