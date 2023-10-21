import mysql from 'mysql2/promise'

const config = {
  host: 'localhost',
  user: 'root',
  password: 'queen4726',
  database: 'moviesdb',
  port: 3306
}

const connection = await mysql.createConnection(config)

export class MovieModel {
  static async getAll ({ genre }) {
    if (genre) {
      const lowerCaseGenre = genre.toLowerCase()

      // get genre ids from database table using genre names
      const [genres] = await connection.query(
        'SELECT id, name FROM genre WHERE LOWER(name) = ?;',
        [lowerCaseGenre]
      )

      // no genre found
      if (genres.length === 0) return []

      // get the id from the first genre result
      const [{ id }] = genres

      const [movies] = await connection.query(
        'SELECT BIN_TO_UUID(movie.id) id, movie.title, movie.year, movie.director, movie.duration, movie.poster, movie.rate, genre.name genre ' +
        'FROM movie_genres ' +
        'JOIN movie ' +
        'ON movie.id = movie_genres.movie_id ' +
        'JOIN genre ON genre.id = movie_genres.genre_id ' +
        'WHERE movie_genres.genre_id = ?', [id])

      return movies
    }
    const [movies] = await connection.query('SELECT BIN_TO_UUID(id) id, title, year, director, duration, poster, rate FROM movie')

    return movies
  }

  static async getById ({ id }) {
    const [movies] = await connection.query('SELECT BIN_TO_UUID(id) id, title, year, director, duration, poster, rate FROM movie WHERE movie.id=UUID_TO_BIN(?);', [id])

    if (movies.length === 0) return null

    return movies[0]
  }

  static async create ({ input }) {
    const {
      genre: genreInput,
      title,
      year,
      director,
      duration,
      poster,
      rate
    } = input

    const [uuidResult] = await connection.query('SELECT UUID() uuid;')
    const [{ uuid }] = uuidResult

    try {
      await connection.query(`INSERT INTO MOVIE(id, title, year, director, duration, poster, rate)
      VALUES (UUID_TO_BIN("${uuid}"),?,?,?,?,?,?)`, [title, year, director, duration, poster, rate])

      await connection.query('INSERT INTO MOVIE_GENRES(movie_id, genre_id) SELECT UUID_TO_BIN(?), id FROM genre WHERE name IN (?)', [uuid, genreInput])
      console.log(genreInput)
    } catch (e) {
      // error
      console.log(e)
    }
    const [movies] = await connection.query('SELECT BIN_TO_UUID(id) id, title, year, director, duration, poster, rate FROM movie WHERE movie.id=UUID_TO_BIN(?);', [uuid])

    return movies[0]
  }

  static async delete ({ id }) {
    const result = await connection.query('DELETE FROM movie WHERE id = UUID_TO_BIN(?)', [id])
    await connection.query('DELETE FROM MOVIE_GENRES where MOVIE_ID = UUID_TO_BIN(?)', [id])
    const [{ affectedRows }] = result
    if (affectedRows > 0) return true
    return false
  }

  static async update ({ id, input }) {
    const {
      title,
      year,
      director,
      duration,
      poster,
      rate
    } = input
    try {
      const result = await connection.query('UPDATE IGNORE movie SET title=IFNULL(?, title), year=IFNULL(?, year), director=IFNULL(?, director), duration=IFNULL(?,duration), poster=IFNULL(?,poster), rate=IFNULL(?, rate) WHERE movie.id = UUID_TO_BIN(?)',
        [title, year, director, duration, poster, rate, id]
      )
      const [{ affectedRows }] = result
      if (affectedRows > 0) return { message: 'Movie Updated' }
      return { message: 'Movie not found' }
    } catch (e) {
      if (e.sqlState === 'HY000') return { message: 'Movie not found' }
    }
  }
}
