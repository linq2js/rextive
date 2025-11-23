# rxblox • TodoMVC

> TodoMVC example built with [rxblox](https://github.com/linq2js/rxblox) - fine-grained reactive state management for React

## About rxblox

**rxblox** provides fine-grained reactivity for React applications using signals. Unlike traditional state management where entire components re-render, rxblox updates only the exact UI elements that depend on changed state.

### Key Features Used in This Example

1. **Signals** - Each todo's `text` and `completed` status are signals
2. **Reactive Components** - `blox()` components with automatic dependency tracking  
3. **Computed Signals** - Filtered todos, active count, and completed count update automatically
4. **Fine-Grained Updates** - Only the specific todo that changed re-renders, not the entire list
5. **No Boilerplate** - No actions, reducers, or selectors required

## Architecture

### Store (`src/store/todos.ts`)
- **Each todo is a signal**: `{ id, text: Signal<string>, completed: Signal<boolean> }`
- **Todo list is a signal**: `todos: Signal<Todo[]>`
- **Computed signals**: `filteredTodos`, `activeCount`, `completedCount`
- **Actions**: Simple functions that update signals directly

### Components
- **Header**: Add new todos
- **MainSection**: Display filtered todo list with toggle all
- **TodoItem**: Individual todo with edit/delete (reactive via `blox()`)
- **Footer**: Filter controls and clear completed

## Performance Benefits

With rxblox:
- ✅ **Updating a todo's checkbox** → Only that single checkbox updates
- ✅ **Editing todo text** → Only that todo item updates
- ✅ **Filtering todos** → Only the visible list updates
- ✅ **Toggle all** → Each checkbox updates independently

Traditional React would re-render the entire component tree for each change.

## Getting Started

```bash
# Install dependencies
pnpm install

# Start dev server
pnpm dev

# Build for production
pnpm build
```

## Comparison with React Redux TodoMVC

This example is based on the [React Redux TodoMVC](https://github.com/tastejs/todomvc/tree/gh-pages/examples/react-redux) but uses rxblox instead:

| Feature | React Redux | rxblox |
|---------|-------------|--------|
| **State Container** | Redux store | Signals |
| **Actions** | Action creators | Direct signal updates |
| **Reducers** | Required | Not needed |
| **Selectors** | Reselect | Computed signals |
| **Connect/Hooks** | `useSelector`, `useDispatch` | `rx()`, `blox()` |
| **Boilerplate** | High (actions, reducers, types) | Minimal |
| **Updates** | Component-level | Fine-grained (sub-component) |
| **DevTools** | Redux DevTools | Standard React DevTools |

## Learn More

- [rxblox Documentation](https://github.com/linq2js/rxblox)
- [TodoMVC](http://todomvc.com)

## License

MIT

