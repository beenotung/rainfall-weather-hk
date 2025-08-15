async function main() {
  let res = await fetch('/data')
  let json = await res.json()
  console.log(json)
}

main()
