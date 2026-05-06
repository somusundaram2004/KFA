export default function DataSection({ title, rows, columns, compact = false }) {
  if (!rows.length) return null

  const visibleColumns = rows.length
    ? columns.filter((column) => rows.some((row) => row[column] !== undefined && row[column] !== null && row[column] !== ''))
    : columns

  function formatCell(column, value) {
    if (value === undefined || value === null || value === '') return '-'
    if (column === 'dob' || column.endsWith('_date') || column === 'date') {
      return String(value).slice(0, 10)
    }
    return String(value)
  }

  return (
    <section className={compact ? 'panel' : 'table-section'}>
      <h3>{title}</h3>
      {!rows.length ? (
        <p className="empty">No records yet.</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>{visibleColumns.map((column) => <th key={column}>{column.replaceAll('_', ' ')}</th>)}</tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  {visibleColumns.map((column) => <td key={column}>{formatCell(column, row[column])}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
