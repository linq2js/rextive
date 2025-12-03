import { signal, wait, task, rx, useScope } from "rextive/react";
import { debounce, refreshOn, to } from "rextive/op";
import { Button } from "./Button";

/**
 * Default profile when no search is performed
 */
const DEFAULT_PROFILE = {
  name: "unknown",
  data: undefined as PokemonData | undefined,
};

interface PokemonData {
  id: number;
  name: string;
  height: number;
  weight: number;
  sprites: {
    front_default: string;
    other?: {
      "official-artwork"?: {
        front_default: string;
      };
    };
  };
  types: Array<{
    type: {
      name: string;
    };
  }>;
}

/**
 * Factory to create pokemon search signals
 */
function createPokemonSearch() {
  // Input signal for pokemon name
  const pokemonName = signal("", { name: "pokemonName" });
  const notifier = signal<"refresh">();
  const pokemonProfile = pokemonName
    // Debounce the input
    .pipe(
      debounce(300),
      // Async signal that fetches pokemon data
      // - Depends on debounced name
      // - Adds 1s delay for demo effect
      // - Calls the Pokemon API
      to(async (name, { safe, abortSignal }) => {
        // Return default if no name
        if (!name) {
          return DEFAULT_PROFILE;
        }

        // Simulate additional delay (1 second)
        await safe(wait.delay(1000));

        // Random error for demo (10% chance)
        if (Math.random() < 0.1) {
          throw new Error("Random API error! Try again.");
        }

        // Fetch from Pokemon API
        const res = await fetch(
          `https://pokeapi.co/api/v2/pokemon/${encodeURIComponent(name)}`,
          { signal: abortSignal }
        );

        if (!res.ok) {
          if (res.status === 404) {
            throw new Error(`Pokemon "${name}" not found`);
          }
          throw new Error(`API error: ${res.status}`);
        }

        const data: PokemonData = await res.json();
        return { name: data.name, data };
      }),
      refreshOn(notifier),
      // Transform to task for loading/error/success states
      // Pass DEFAULT_PROFILE as the initial value before first computation
      task(DEFAULT_PROFILE, { name: "pokemonProfileTask" })
    );

  return {
    notifier,
    pokemonName,
    pokemonProfile,
  };
}

/**
 * Pokemon Search Demo Component
 *
 * Demonstrates:
 * - debounce() operator for input throttling
 * - wait.delay() for artificial delay
 * - task() for loading/error/success states
 * - Async signal with abortSignal for cancellation
 */
export function PokemonSearch() {
  const { pokemonName, notifier, pokemonProfile } =
    useScope(createPokemonSearch);

  return (
    <div className="pokemon-search">
      <h3>🔍 Pokemon Search</h3>
      <p className="demo-description">
        Type a Pokemon name or click an example below. Uses debounce + 1s delay.
      </p>

      <div className="example-buttons">
        {["pikachu", "charizard", "mewtwo", "gengar", "eevee", "snorlax"].map(
          (name) => (
            <Button
              key={name}
              variant="outline"
              size="sm"
              onClick={() => pokemonName.set(name)}
            >
              {name}
            </Button>
          )
        )}
      </div>

      <div className="search-input-row">
        {rx(() => (
          <input
            type="text"
            placeholder="Enter Pokemon name..."
            className="pokemon-input"
            value={pokemonName()}
            onChange={(e) => pokemonName.set(e.target.value)}
          />
        ))}
        <button
          className="pokemon-refresh-btn"
          onClick={() => notifier.set("refresh")}
          title="Refresh search"
        >
          🔄
        </button>
      </div>

      {rx(() => {
        const { status, loading, error, value } = pokemonProfile();
        const name = pokemonName().trim();

        // Only show loading if we have a name to search
        const showLoading = loading && name.length > 0;

        return (
          <div className="search-result">
            {/* Loading indicator - only when searching with a name */}
            {showLoading && (
              <div className="loading-state">
                <span className="spinner" />
                <span>Searching...</span>
              </div>
            )}

            {/* Error state */}
            {error && (
              <div className="error-state">
                <span className="error-icon">⚠️</span>
                <span>{String(error)}</span>
              </div>
            )}

            {/* Success state with pokemon data */}
            {value.data && (
              <div className="pokemon-card">
                <img
                  src={
                    value.data.sprites.other?.["official-artwork"]
                      ?.front_default || value.data.sprites.front_default
                  }
                  alt={value.data.name}
                  className="pokemon-image"
                />
                <div className="pokemon-info">
                  <h4 className="pokemon-name">
                    #{value.data.id} {value.data.name}
                  </h4>
                  <div className="pokemon-types">
                    {value.data.types.map((t) => (
                      <span
                        key={t.type.name}
                        className={`type-badge type-${t.type.name}`}
                      >
                        {t.type.name}
                      </span>
                    ))}
                  </div>
                  <div className="pokemon-stats">
                    <span>Height: {value.data.height / 10}m</span>
                    <span>Weight: {value.data.weight / 10}kg</span>
                  </div>
                </div>
              </div>
            )}

            {/* Serialized profile data - show prev value even during loading/error */}
            {value.name !== "unknown" && (
              <pre className="profile-json">
                {JSON.stringify(value, null, 2)}
              </pre>
            )}

            {/* Empty state */}
            {status === "success" && !value.data && (
              <div className="empty-state">
                <span className="pokeball">🔴</span>
                <span>Enter a Pokemon name to search</span>
              </div>
            )}
          </div>
        );
      })}

      <style>{`
        .pokemon-search {
          background: linear-gradient(135deg, #1e3a5f, #1a2744);
          border-radius: 16px;
          padding: 24px;
          margin-top: 24px;
          border: 1px solid rgba(96, 165, 250, 0.2);
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        }

        .pokemon-search h3 {
          margin: 0 0 8px 0;
          color: #93c5fd;
          font-size: 20px;
        }

        .pokemon-search .demo-description {
          margin: 0 0 12px 0;
          color: #7dd3fc;
          font-size: 13px;
          opacity: 0.8;
        }

        .example-buttons {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 16px;
        }

        .example-buttons .btn {
          text-transform: capitalize;
        }

        .search-input-row {
          display: flex;
          gap: 10px;
          margin-bottom: 20px;
        }

        .pokemon-input {
          flex: 1;
          height: 44px;
          padding: 0 14px;
          background: rgba(15, 23, 42, 0.8);
          border: 1px solid rgba(96, 165, 250, 0.3);
          border-radius: 10px;
          color: #e0f2fe;
          font-size: 15px;
          outline: none;
          transition: all 0.2s;
        }

        .pokemon-input:focus {
          border-color: #60a5fa;
          box-shadow: 0 0 0 3px rgba(96, 165, 250, 0.15);
        }

        .pokemon-input::placeholder {
          color: #64748b;
        }

        .pokemon-refresh-btn {
          width: 44px;
          height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          border: none;
          border-radius: 10px;
          color: white;
          font-size: 18px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .pokemon-refresh-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
        }

        .search-result {
          min-height: 180px;
        }

        .loading-state {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 20px;
          color: #93c5fd;
          font-size: 14px;
        }

        .loading-state .spinner {
          width: 20px;
          height: 20px;
          border: 2px solid rgba(147, 197, 253, 0.3);
          border-top-color: #93c5fd;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .error-state {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 16px 20px;
          background: rgba(239, 68, 68, 0.15);
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: 12px;
          color: #fca5a5;
          font-size: 14px;
          margin-bottom: 16px;
        }

        .error-icon {
          font-size: 18px;
        }

        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          padding: 40px 20px;
          color: #64748b;
          font-size: 14px;
        }

        .pokeball {
          font-size: 40px;
          opacity: 0.5;
        }

        .pokemon-card {
          display: flex;
          gap: 20px;
          padding: 20px;
          background: rgba(30, 41, 59, 0.8);
          border-radius: 16px;
          border: 1px solid rgba(96, 165, 250, 0.2);
          margin-bottom: 16px;
        }

        .profile-json {
          margin-top: 16px;
          padding: 16px;
          background: rgba(15, 23, 42, 0.8);
          border: 1px solid rgba(96, 165, 250, 0.15);
          border-radius: 10px;
          color: #94a3b8;
          font-size: 11px;
          font-family: 'JetBrains Mono', 'Fira Code', monospace;
          overflow-x: auto;
          max-height: 300px;
          overflow-y: auto;
        }

        .pokemon-image {
          width: 150px;
          height: 150px;
          object-fit: contain;
          background: rgba(15, 23, 42, 0.5);
          border-radius: 12px;
          padding: 10px;
        }

        .pokemon-info {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .pokemon-name {
          margin: 0;
          font-size: 24px;
          color: #f0f9ff;
          text-transform: capitalize;
        }

        .pokemon-types {
          display: flex;
          gap: 8px;
        }

        .type-badge {
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          color: white;
        }

        .type-normal { background: #a8a878; }
        .type-fire { background: #f08030; }
        .type-water { background: #6890f0; }
        .type-electric { background: #f8d030; color: #333; }
        .type-grass { background: #78c850; }
        .type-ice { background: #98d8d8; color: #333; }
        .type-fighting { background: #c03028; }
        .type-poison { background: #a040a0; }
        .type-ground { background: #e0c068; color: #333; }
        .type-flying { background: #a890f0; }
        .type-psychic { background: #f85888; }
        .type-bug { background: #a8b820; }
        .type-rock { background: #b8a038; }
        .type-ghost { background: #705898; }
        .type-dragon { background: #7038f8; }
        .type-dark { background: #705848; }
        .type-steel { background: #b8b8d0; color: #333; }
        .type-fairy { background: #ee99ac; }

        .pokemon-stats {
          display: flex;
          gap: 20px;
          color: #94a3b8;
          font-size: 14px;
        }
      `}</style>
    </div>
  );
}
