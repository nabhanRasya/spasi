// Binary PocketBase kustom untuk Spasi: sama dengan PocketBase biasa, ditambah
//  1) sanitasi HTML tulisan di server (bluemonday) dan penghitung kata yang sama dengan klien,
//  2) hook JavaScript (pb_hooks/*.pb.js) dan migrasi (pb_migrations/*.js) tetap aktif.
package main

import (
	"html"
	"log"
	"os"
	"regexp"
	"strings"

	"github.com/microcosm-cc/bluemonday"
	"github.com/pocketbase/pocketbase"
	"github.com/pocketbase/pocketbase/core"
	"github.com/pocketbase/pocketbase/plugins/jsvm"
	"github.com/pocketbase/pocketbase/plugins/migratecmd"
)

var mediaSrc = regexp.MustCompile(`^/api/files/media/[a-z0-9]+/[\w.\-]+(\?thumb=\d+x\d+)?$`)

// Daftar putih yang sama dengan services/html.js di klien.
func policy() *bluemonday.Policy {
	p := bluemonday.NewPolicy()
	p.AllowElements("p", "h2", "h3", "blockquote", "hr", "ul", "ol", "li",
		"strong", "em", "br", "figure", "figcaption")
	p.AllowAttrs("href").OnElements("a")
	p.AllowURLSchemes("https", "mailto")
	p.RequireNoFollowOnLinks(true)
	p.AddTargetBlankToFullyQualifiedLinks(true)
	p.AllowAttrs("src").Matching(mediaSrc).OnElements("img")
	p.AllowAttrs("alt").OnElements("img")
	p.AllowAttrs("data-ai").OnElements("figure")
	return p
}

var (
	blockEnd = regexp.MustCompile(`(?i)</(p|h2|h3|blockquote|li|figcaption)>|<br\s*/?>`)
	strict   = bluemonday.StrictPolicy()
)

// Port dari U.words di src/lib/core/text.js: buang tag (pemisah blok jadi spasi), urai entitas, hitung token.
func countWords(body string) int {
	spaced := blockEnd.ReplaceAllString(body, " ")
	text := html.UnescapeString(strict.Sanitize(spaced))
	return len(strings.Fields(text))
}

func main() {
	app := pocketbase.New()
	pol := policy()

	isDev := strings.Contains(os.Args[0], "go-build")

	jsvm.MustRegister(app, jsvm.Config{})
	migratecmd.MustRegister(app, app.RootCmd, migratecmd.Config{
		TemplateLang: migratecmd.TemplateLangJS,
		Automigrate:  isDev,
	})

	sanitize := func(e *core.RecordEvent) error {
		body := pol.Sanitize(e.Record.GetString("body"))
		e.Record.Set("body", body)
		e.Record.Set("words", countWords(body))
		return e.Next()
	}
	app.OnRecordCreate("posts").BindFunc(sanitize)
	app.OnRecordUpdate("posts").BindFunc(sanitize)

	if err := app.Start(); err != nil {
		log.Fatal(err)
	}
}
