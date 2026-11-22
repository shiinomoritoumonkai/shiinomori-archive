/**
 * 思惟の森アーカイブ：フォルダの雛形づくり（docs/SPEC.md §5.4、任意）
 *
 * 1966 年〜今年の「YYYY年/YYYY年_春合宿・夏合宿・秋合宿」を、アーカイブ用ルートフォルダの中に一括で作る。
 * 既にあるフォルダは作らない（名前は NFKC で正規化して比べる）。
 *
 * 使い方：
 *   1. https://script.google.com/ で「新しいプロジェクト」→ このファイルの中身を貼り付ける。
 *   2. ROOT_FOLDER_ID にアーカイブ用ルートフォルダの ID を入れる（URL の folders/ の後ろ）。
 *   3. 関数 createFolders を選んで「実行」。初回は Drive へのアクセス許可を求められる。
 *   4. 実行ログに、作ったフォルダの数が出る。
 *
 * 写真が 1 枚もないイベントフォルダは、サイトの年のページには出ない。
 */
var ROOT_FOLDER_ID = 'ここにフォルダ ID を貼る';
var FIRST_YEAR = 1966;
var EVENTS = ['春合宿', '夏合宿', '秋合宿'];

function createFolders() {
  var root = DriveApp.getFolderById(ROOT_FOLDER_ID);
  var thisYear = new Date().getFullYear();
  var created = 0;
  for (var y = FIRST_YEAR; y <= thisYear; y++) {
    var yearName = y + '年';
    var yearFolder = findChild_(root, yearName);
    if (!yearFolder) {
      yearFolder = root.createFolder(yearName);
      created++;
    }
    for (var i = 0; i < EVENTS.length; i++) {
      var name = yearName + '_' + EVENTS[i];
      if (!findChild_(yearFolder, name)) {
        yearFolder.createFolder(name);
        created++;
      }
    }
  }
  Logger.log('作成したフォルダ: ' + created + ' 個');
}

function normalize_(s) {
  return s.normalize('NFKC').replace(/\s+/g, ' ').trim();
}

function findChild_(parent, name) {
  var want = normalize_(name);
  var it = parent.getFolders();
  while (it.hasNext()) {
    var f = it.next();
    if (normalize_(f.getName()) === want) return f;
  }
  return null;
}
