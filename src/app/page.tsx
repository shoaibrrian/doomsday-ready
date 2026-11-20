"use client";

import { useEffect, useState } from "react";

type Movie = {
  _id: string;
  title: string;
  releaseYear: number;
  runtime: number;
  watched: boolean;
  prerequisites: (string | { _id: string; title: string })[];
};

type Cinema = {
  _id: string;
  name: string;
  bundleSizes: number[];
};

type RewatchData = {
  targetMovie: string;
  rewatchOrder: Movie[];
  totalMovies: number;
  watchedCount: number;
  remainingRuntime: number;
};

type BookingData = {
  cinema: string;
  groupSize: number;
  totalBundles?: number;
  bundles?: { size: number; count: number }[];
};

type Tab = "movies" | "rewatch" | "booking";

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>("movies");
  const [movies, setMovies] = useState<Movie[]>([]);
  const [cinemas, setCinemas] = useState<Cinema[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const [movieForm, setMovieForm] = useState({
    title: "",
    releaseYear: "",
    runtime: "",
  });

  const [selectedMovie, setSelectedMovie] = useState("");
  const [selectedPrerequisites, setSelectedPrerequisites] = useState<string[]>(
    [],
  );
  const [rewatch, setRewatch] = useState<RewatchData | null>(null);

  const [cinemaName, setCinemaName] = useState("");
  const [bundleSizes, setBundleSizes] = useState("2, 5");
  const [selectedCinema, setSelectedCinema] = useState("");
  const [groupSize, setGroupSize] = useState("6");
  const [booking, setBooking] = useState<BookingData | null>(null);
  const [bookingPossible, setBookingPossible] = useState<boolean | null>(null);

  async function loadData() {
    try {
      const [movieResponse, cinemaResponse] = await Promise.all([
        fetch("/api/movies"),
        fetch("/api/cinemas"),
      ]);

      const movieResult = await movieResponse.json();
      const cinemaResult = await cinemaResponse.json();

      if (movieResult.success) setMovies(movieResult.data || []);
      if (cinemaResult.success) setCinemas(cinemaResult.data || []);
    } catch {
      setMessage("Could not connect to the server.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  function notify(text: string) {
    setMessage(text);
    window.setTimeout(() => setMessage(""), 3500);
  }

  async function addMovie(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    try {
      const response = await fetch("/api/movies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: movieForm.title,
          releaseYear: Number(movieForm.releaseYear),
          runtime: Number(movieForm.runtime),
          prerequisites: [],
          watched: false,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        notify(result.message || "Could not create movie.");
        return;
      }

      setMovieForm({ title: "", releaseYear: "", runtime: "" });
      notify("Movie added successfully.");
      await loadData();
    } catch {
      notify("Something went wrong.");
    }
  }

  async function toggleWatched(movie: Movie) {
    try {
      const response = await fetch(`/api/movies/${movie._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ watched: !movie.watched }),
      });

      const result = await response.json();

      if (!response.ok) {
        notify(result.message || "Could not update movie.");
        return;
      }

      await loadData();
      if (selectedMovie) await getRewatchOrder(selectedMovie);
    } catch {
      notify("Could not update watched status.");
    }
  }

  async function savePrerequisites() {
    if (!selectedMovie) return;

    try {
      const response = await fetch(`/api/movies/${selectedMovie}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prerequisites: selectedPrerequisites }),
      });

      const result = await response.json();

      if (!response.ok) {
        notify(result.message || "Could not update prerequisites.");
        return;
      }

      notify("Prerequisites updated.");
      await loadData();
    } catch {
      notify("Could not update prerequisites.");
    }
  }

  async function getRewatchOrder(id: string) {
    setSelectedMovie(id);
    setRewatch(null);

    try {
      const response = await fetch(`/api/movies/${id}/rewatch-order`);
      const result = await response.json();

      if (!response.ok) {
        notify(result.message || "Could not generate rewatch plan.");
        return;
      }

      setRewatch(result.data);
    } catch {
      notify("Could not load rewatch plan.");
    }
  }

  async function addCinema(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const sizes = bundleSizes.split(",").map((value) => Number(value.trim()));

    try {
      const response = await fetch("/api/cinemas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: cinemaName, bundleSizes: sizes }),
      });

      const result = await response.json();

      if (!response.ok) {
        notify(result.message || "Could not create cinema.");
        return;
      }

      setCinemaName("");
      setBundleSizes("2, 5");
      notify("Cinema added successfully.");
      await loadData();
    } catch {
      notify("Could not create cinema.");
    }
  }

  async function getBooking(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBooking(null);
    setBookingPossible(null);

    try {
      const response = await fetch(
        `/api/cinemas/${selectedCinema}/booking?groupSize=${groupSize}`,
      );

      const result = await response.json();

      if (!response.ok) {
        notify(result.message || "Could not calculate booking.");
        return;
      }

      setBookingPossible(result.possible);
      if (result.possible) setBooking(result.data);
      else setBooking(result.data || null);
    } catch {
      notify("Could not calculate booking.");
    }
  }

  const watchedMovies = movies.filter((movie) => movie.watched).length;
  const progress = movies.length
    ? Math.round((watchedMovies / movies.length) * 100)
    : 0;

  const navItems: { id: Tab; label: string; icon: string }[] = [
    { id: "movies", label: "Movies", icon: "🎬" },
    { id: "rewatch", label: "Rewatch Plan", icon: "📋" },
    { id: "booking", label: "Booking", icon: "🎟️" },
  ];

  return (
    <main className="dashboard">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">D</div>
          <div>
            <h1>DOOMSDAY</h1>
            <span>READY</span>
          </div>
        </div>

        <div className="sidebar-label">WORKSPACE</div>

        <nav className="navigation">
          {navItems.map((item) => (
            <button
              key={item.id}
              className={`nav-item ${activeTab === item.id ? "active" : ""}`}
              onClick={() => setActiveTab(item.id)}
            >
              <span>{item.icon}</span>
              {item.label}
              {activeTab === item.id && <span className="nav-arrow">›</span>}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="status-dot" />
          <span>System operational</span>
          <span className="version">v1.0</span>
        </div>
      </aside>

      <section className="main-content">
        <header className="topbar">
          <div>
            <div className="breadcrumb">DOOMSDAY READY / WORKSPACE</div>
            <h2>
              {activeTab === "movies"
                ? "Movie Collection"
                : activeTab === "rewatch"
                  ? "Your Rewatch Plan"
                  : "Watch Party Booking"}
            </h2>
          </div>

          <div className="topbar-right">
            <span className="live-indicator" />
            <span>ALL SYSTEMS GO</span>
          </div>
        </header>

        {message && <div className="toast">{message}</div>}

        {loading ? (
          <div className="empty-state">Loading your workspace...</div>
        ) : (
          <>
            {activeTab === "movies" && (
              <div className="content-area">
                <div className="welcome">
                  <div>
                    <div className="eyebrow">THE MARVEL REWATCH PROJECT</div>
                    <h3>
                      Prepare for the <span>Endgame.</span>
                    </h3>
                    <p>
                      Build your watchlist. Track your progress. Be ready for
                      Doomsday.
                    </p>
                  </div>
                  <div className="welcome-symbol">✦</div>
                </div>

                <div className="stats-grid">
                  <div className="stat-card">
                    <span className="stat-icon">🎬</span>
                    <span className="stat-label">TOTAL MOVIES</span>
                    <strong>{movies.length}</strong>
                  </div>
                  <div className="stat-card">
                    <span className="stat-icon">✓</span>
                    <span className="stat-label">WATCHED</span>
                    <strong>{watchedMovies}</strong>
                  </div>
                  <div className="stat-card">
                    <span className="stat-icon">◷</span>
                    <span className="stat-label">REMAINING</span>
                    <strong>
                      {movies
                        .filter((m) => !m.watched)
                        .reduce((sum, m) => sum + m.runtime, 0)}{" "}
                      <small>min</small>
                    </strong>
                  </div>
                  <div className="stat-card">
                    <span className="stat-icon">◈</span>
                    <span className="stat-label">COLLECTION PROGRESS</span>
                    <strong>
                      {progress}
                      <small>%</small>
                    </strong>
                  </div>
                </div>

                <div className="section-heading">
                  <div>
                    <div className="eyebrow">YOUR COLLECTION</div>
                    <h3>
                      All Movies <span className="count">{movies.length}</span>
                    </h3>
                  </div>
                </div>

                <div className="movie-layout">
                  <div className="panel movie-panel">
                    <div className="panel-heading">
                      <h4>Movie Library</h4>
                      <span>{movies.length} TITLES</span>
                    </div>

                    {movies.length === 0 ? (
                      <div className="empty-state">
                        No movies yet. Add your first movie.
                      </div>
                    ) : (
                      <div className="movie-list">
                        {movies.map((movie) => (
                          <div className="movie-row" key={movie._id}>
                            <button
                              className={`watch-check ${movie.watched ? "checked" : ""}`}
                              onClick={() => toggleWatched(movie)}
                              aria-label="Toggle watched"
                            >
                              {movie.watched ? "✓" : ""}
                            </button>
                            <div className="movie-info">
                              <strong>{movie.title}</strong>
                              <span>
                                {movie.releaseYear} · {movie.runtime} min
                              </span>
                            </div>
                            <span
                              className={`watch-status ${movie.watched ? "done" : ""}`}
                            >
                              {movie.watched ? "WATCHED" : "UNWATCHED"}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="right-column">
                    <form className="panel form-panel" onSubmit={addMovie}>
                      <div className="panel-heading">
                        <h4>＋ Add Movie</h4>
                      </div>
                      <label>Movie Title</label>
                      <input
                        required
                        placeholder="e.g. Iron Man"
                        value={movieForm.title}
                        onChange={(e) =>
                          setMovieForm({ ...movieForm, title: e.target.value })
                        }
                      />
                      <div className="input-row">
                        <div>
                          <label>Release Year</label>
                          <input
                            type="number"
                            min="1"
                            required
                            placeholder="2008"
                            value={movieForm.releaseYear}
                            onChange={(e) =>
                              setMovieForm({
                                ...movieForm,
                                releaseYear: e.target.value,
                              })
                            }
                          />
                        </div>
                        <div>
                          <label>Runtime (min)</label>
                          <input
                            type="number"
                            min="1"
                            max="300"
                            required
                            placeholder="126"
                            value={movieForm.runtime}
                            onChange={(e) =>
                              setMovieForm({
                                ...movieForm,
                                runtime: e.target.value,
                              })
                            }
                          />
                        </div>
                      </div>
                      <button className="primary-button" type="submit">
                        Add to Collection ↗
                      </button>
                    </form>

                    <div className="panel form-panel">
                      <div className="panel-heading">
                        <h4>Prerequisites</h4>
                      </div>
                      <label>Select a movie to edit</label>
                      <select
                        value={selectedMovie}
                        onChange={(e) => {
                          const id = e.target.value;
                          setSelectedMovie(id);
                          const movie = movies.find((m) => m._id === id);
                          setSelectedPrerequisites(
                            movie
                              ? movie.prerequisites.map((p) =>
                                  typeof p === "string" ? p : p._id,
                                )
                              : [],
                          );
                        }}
                      >
                        <option value="">Choose movie</option>
                        {movies.map((movie) => (
                          <option key={movie._id} value={movie._id}>
                            {movie.title}
                          </option>
                        ))}
                      </select>
                      {selectedMovie && (
                        <>
                          <div className="prerequisite-list">
                            {movies
                              .filter((m) => m._id !== selectedMovie)
                              .map((movie) => (
                                <label
                                  className="prerequisite-option"
                                  key={movie._id}
                                >
                                  <input
                                    type="checkbox"
                                    checked={selectedPrerequisites.includes(
                                      movie._id,
                                    )}
                                    onChange={(e) =>
                                      setSelectedPrerequisites((current) =>
                                        e.target.checked
                                          ? [...current, movie._id]
                                          : current.filter(
                                              (id) => id !== movie._id,
                                            ),
                                      )
                                    }
                                  />
                                  {movie.title}
                                </label>
                              ))}
                          </div>
                          <button
                            className="secondary-button"
                            onClick={savePrerequisites}
                          >
                            Save Prerequisites
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "rewatch" && (
              <div className="content-area">
                <div className="welcome">
                  <div>
                    <div className="eyebrow">YOUR MISSION STARTS HERE</div>
                    <h3>
                      Every story has a <span>beginning.</span>
                    </h3>
                    <p>
                      Select a target movie to discover everything you need to
                      watch first.
                    </p>
                  </div>
                  <div className="welcome-symbol">⌁</div>
                </div>

                <div className="panel form-panel target-panel">
                  <label>SELECT TARGET MOVIE</label>
                  <select
                    value={selectedMovie}
                    onChange={(e) => getRewatchOrder(e.target.value)}
                  >
                    <option value="">Choose your target movie</option>
                    {movies.map((movie) => (
                      <option key={movie._id} value={movie._id}>
                        {movie.title}
                      </option>
                    ))}
                  </select>
                </div>

                {rewatch && (
                  <>
                    <div className="stats-grid">
                      <div className="stat-card">
                        <span className="stat-label">MOVIES TO WATCH</span>
                        <strong>{rewatch.totalMovies}</strong>
                      </div>
                      <div className="stat-card">
                        <span className="stat-label">ALREADY WATCHED</span>
                        <strong>{rewatch.watchedCount}</strong>
                      </div>
                      <div className="stat-card">
                        <span className="stat-label">REMAINING TIME</span>
                        <strong>
                          {rewatch.remainingRuntime} <small>min</small>
                        </strong>
                      </div>
                      <div className="stat-card">
                        <span className="stat-label">PROGRESS</span>
                        <strong>
                          {rewatch.totalMovies
                            ? Math.round(
                                (rewatch.watchedCount / rewatch.totalMovies) *
                                  100,
                              )
                            : 100}
                          <small>%</small>
                        </strong>
                      </div>
                    </div>

                    <div className="panel plan-panel">
                      <div className="panel-heading">
                        <h4>Watch Before: {rewatch.targetMovie}</h4>
                        <span>
                          {rewatch.watchedCount} OF {rewatch.totalMovies}{" "}
                          WATCHED
                        </span>
                      </div>
                      <div className="progress-track">
                        <div
                          className="progress-fill"
                          style={{
                            width: `${rewatch.totalMovies ? (rewatch.watchedCount / rewatch.totalMovies) * 100 : 100}%`,
                          }}
                        />
                      </div>
                      {rewatch.rewatchOrder.length === 0 ? (
                        <div className="empty-state">
                          No prerequisites needed. You're ready!
                        </div>
                      ) : (
                        rewatch.rewatchOrder.map((movie, index) => (
                          <div className="movie-row" key={movie._id}>
                            <span className="order-number">
                              {String(index + 1).padStart(2, "0")}
                            </span>
                            <div className="movie-info">
                              <strong>{movie.title}</strong>
                              <span>
                                {movie.releaseYear} · {movie.runtime} min
                              </span>
                            </div>
                            <span
                              className={`watch-status ${movie.watched ? "done" : ""}`}
                            >
                              {movie.watched ? "✓ WATCHED" : "TO WATCH"}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </>
                )}
              </div>
            )}

            {activeTab === "booking" && (
              <div className="content-area">
                <div className="welcome">
                  <div>
                    <div className="eyebrow">ASSEMBLE YOUR SQUAD</div>
                    <h3>
                      Watch together. <span>Go bigger.</span>
                    </h3>
                    <p>
                      Find the exact bundle combination for your opening-night
                      group.
                    </p>
                  </div>
                  <div className="welcome-symbol">✧</div>
                </div>

                <div className="movie-layout booking-layout">
                  <div className="panel form-panel">
                    <div className="panel-heading">
                      <h4>Find Your Booking Quote</h4>
                    </div>
                    <form onSubmit={getBooking}>
                      <label>Select Cinema</label>
                      <select
                        required
                        value={selectedCinema}
                        onChange={(e) => setSelectedCinema(e.target.value)}
                      >
                        <option value="">Choose cinema</option>
                        {cinemas.map((cinema) => (
                          <option key={cinema._id} value={cinema._id}>
                            {cinema.name}
                          </option>
                        ))}
                      </select>
                      <label>Group Size</label>
                      <input
                        type="number"
                        min="1"
                        max="10000"
                        required
                        value={groupSize}
                        onChange={(e) => setGroupSize(e.target.value)}
                      />
                      <button
                        className="primary-button"
                        type="submit"
                        disabled={!selectedCinema}
                      >
                        Calculate Bundles ↗
                      </button>
                    </form>
                    <div className="divider-line" />
                    <div className="panel-heading">
                      <h4>＋ Add Cinema</h4>
                    </div>
                    <form onSubmit={addCinema}>
                      <label>Cinema Name</label>
                      <input
                        required
                        placeholder="e.g. Star Cineplex"
                        value={cinemaName}
                        onChange={(e) => setCinemaName(e.target.value)}
                      />
                      <label>Bundle Sizes</label>
                      <input
                        required
                        placeholder="e.g. 2, 5, 10"
                        value={bundleSizes}
                        onChange={(e) => setBundleSizes(e.target.value)}
                      />
                      <p className="helper-text">
                        Separate bundle sizes with commas. Use 1–10 sizes, each
                        between 1 and 500.
                      </p>
                      <button className="secondary-button" type="submit">
                        Create Cinema
                      </button>
                    </form>
                  </div>

                  <div className="panel result-panel">
                    <div className="panel-heading">
                      <h4>Booking Result</h4>
                    </div>
                    {bookingPossible === null ? (
                      <div className="empty-state">
                        <div className="result-icon">🎟️</div>
                        <strong>Your booking quote will appear here.</strong>
                        <p>Select a cinema and enter your group size.</p>
                      </div>
                    ) : bookingPossible === false ? (
                      <div className="empty-state">
                        <div className="result-icon">✕</div>
                        <strong>Exact booking not possible.</strong>
                        <p>
                          No combination of available bundles matches{" "}
                          {groupSize} seats.
                        </p>
                      </div>
                    ) : booking ? (
                      <>
                        <div className="booking-success">
                          <span>EXACT MATCH FOUND</span>
                          <strong>{booking.totalBundles}</strong>
                          <small>TOTAL BUNDLES</small>
                        </div>
                        <p className="result-subtitle">
                          {booking.cinema} · {booking.groupSize} seats
                        </p>
                        {booking.bundles?.map((bundle) => (
                          <div className="bundle-row" key={bundle.size}>
                            <span>{bundle.size}-seat bundle</span>
                            <strong>× {bundle.count}</strong>
                          </div>
                        ))}
                        <div className="total-row">
                          <span>Total seats</span>
                          <strong>
                            {booking.bundles?.reduce(
                              (sum, b) => sum + b.size * b.count,
                              0,
                            )}
                          </strong>
                        </div>
                      </>
                    ) : null}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </section>
    </main>
  );
}
