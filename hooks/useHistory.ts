import { useState, useCallback, useRef } from 'react';

interface History<T> {
  past: T[];
  present: T;
  future: T[];
}

export const useHistory = <T>(initialState: T) => {
  const [state, setState] = useState<History<T>>({
    past: [],
    present: initialState,
    future: [],
  });

  const initialStateRef = useRef(initialState);

  const canUndo = state.past.length > 0;
  const canRedo = state.future.length > 0;

  /**
   * Commits a new state to history. The current state is moved to the 'past' array.
   */
  const set = useCallback((newState: T) => {
    setState(currentState => {
      if (JSON.stringify(newState) === JSON.stringify(currentState.present)) {
        return currentState;
      }
      return {
        past: [...currentState.past, currentState.present],
        present: newState,
        future: [],
      };
    });
  }, []);

  /**
   * Updates the present state without creating a new history entry.
   * Useful for live updates like dragging, where only the final state should be committed.
   */
  const setPresent = useCallback((newState: T | ((prevState: T) => T)) => {
    setState(currentState => ({
        ...currentState,
        present: newState instanceof Function ? newState(currentState.present) : newState,
    }));
  }, []);


  const undo = useCallback(() => {
    if (!canUndo) return;
    setState(currentState => {
      const newPresent = currentState.past[currentState.past.length - 1];
      const newPast = currentState.past.slice(0, currentState.past.length - 1);
      return {
        past: newPast,
        present: newPresent,
        future: [currentState.present, ...currentState.future],
      };
    });
  }, [canUndo]);

  const redo = useCallback(() => {
    if (!canRedo) return;
    setState(currentState => {
      const newPresent = currentState.future[0];
      const newFuture = currentState.future.slice(1);
      return {
        past: [...currentState.past, currentState.present],
        present: newPresent,
        future: newFuture,
      };
    });
  }, [canRedo]);
  
  // FIX: Allow reset to take a new initial state.
  const reset = useCallback((newInitialState?: T) => {
    setState({
        past: [],
        present: newInitialState !== undefined ? newInitialState : initialStateRef.current,
        future: []
    });
  }, []);

  return {
    state: state.present,
    set,
    setPresent,
    undo,
    redo,
    reset,
    canUndo,
    canRedo,
  };
};
