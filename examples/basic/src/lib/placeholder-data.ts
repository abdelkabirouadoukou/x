const titles = [
  "sunt aut facere repellat provident occaecati excepturi optio reprehenderit",
  "qui est esse", "ea molestias quasi exercitationem repellat qui ipsa sit aut",
  "eum et est occaecati", "nesciunt quas odio", "dolorem eum magni eos aperiam quia",
  "magnam facilis autem", "dolorem dolore est ipsam", "nesciunt iure omnis dolorem tempora et accusantium",
  "optio molestias id quia eum", "et iusto sed quo iure", "ullam et saepe reiciendis voluptatem adipisci",
  "repudiandae veniam quaerat sunt sed", "aspernatur aperiam consequatur", "ratione porro quas",
  "sapiente assumenda molestiae atque", "ut voluptatum aliquid illo tenetur", "adipisci placeat illum aut reiciendis",
  "doloribus ad provident suscipit at", "id maiores molestias", "alias distinctio fugit",
  "et fugit quod quis", "et quia tempora", "quasi fugit ut totam",
  "doloremque autem similique et", "veritatis unde neque", "officiis quia ullam deleniti",
  "quo voluptatem dolorum", "atque suscipit voluptatem ab", "excepturi aut ut praesentium",
];
const bodies = [
  "quia et suscipit suscipit recusandae consequuntur expedita et cum reprehenderit molestiae ut ut quas totam nostrum rerum est autem sunt rem eveniet architecto",
  "est rerum tempore vitae sequi sint nihil reprehenderit dolor beatae ea dolores neque fugiat blanditiis voluptate porro vel nihil molestiae ut reiciendis qui aperiam non debitis possimus qui neque nisi nulla",
  "quia molestiae reprehenderit quasi aspernatur aut expedita occaecati aliquam eveniet laudantium omnis quibusdam delectus saepe quia accusamus maiores nam est cum et ducimus et vero voluptates excepturi deleniti ratione",
  "non et atque occaecati deserunt quas accusantium unde odit nobis qui voluptatem quia voluptas consequuntur itaque dolor et qui rerum deleniti ut occaecati",
  "harum non quasi et ratione tempore iure ex voluptates in ratione harum architecto fugit inventore cupiditate voluptates magni quo et",
  "doloremque ex facilis sit sint culpa soluta assumenda eligendi ut ut voluptate et non ipsa doloremque repellendus quas est cum quibusdam impedit",
];
const firstNames = ["Leanne", "Ervin", "Clementine", "Patricia", "Chelsey", "Mrs.Dennis", "Kurtis", "Nicholas", "Glenna", "Clementina"];
const lastNames = ["Graham", "Howell", "Bauch", "Lebsack", "Dietrich", "Schulist", "Weissnat", "Runolfsdottir", "Reichert", "DuBuque"];
const emails = ["Sincere@april.biz", "Shanna@melissa.tv", "Nathan@yesenia.net", "Julianne.OConner@kory.org", "Lucio_Hettinger@annie.ca", "Karley_Dach@jasper.info", "Telly.Hoeger@billy.biz", "Sherwood@rosamond.me", "Chaim_McDermott@dana.io", "Rey.Padberg@karina.biz"];

function pick<T>(arr: T[], i: number): T { return arr[i % arr.length] as T; }

export interface Post { userId: number; id: number; title: string; body: string; }
export interface Comment { postId: number; id: number; name: string; email: string; body: string; }
export interface Todo { userId: number; id: number; title: string; completed: boolean; }
export interface User { id: number; name: string; username: string; email: string; address: { street: string; suite: string; city: string; zipcode: string }; phone: string; website: string; company: { name: string; catchPhrase: string; bs: string }; }
export interface Album { userId: number; id: number; title: string; }
export interface Photo { albumId: number; id: number; title: string; url: string; thumbnailUrl: string; }

const posts: Post[] = Array.from({ length: 100 }, (_, i) => ({
  userId: (i % 10) + 1, id: i + 1,
  title: pick(titles, i), body: pick(bodies, i),
}));

const comments: Comment[] = Array.from({ length: 500 }, (_, i) => ({
  postId: (i % 100) + 1, id: i + 1,
  name: `comment ${i + 1}`, email: pick(emails, i),
  body: `laudantium enim quasi est quidem magnam voluptate ipsam eos tempora quo necessitatibus dolor quam autem quasi reiciendis et nam sapiente accusantium`,
}));

const todos: Todo[] = Array.from({ length: 200 }, (_, i) => ({
  userId: (i % 10) + 1, id: i + 1,
  title: pick(titles, i * 3 + 2), completed: i % 3 === 0,
}));

const users: User[] = Array.from({ length: 10 }, (_, i) => ({
  id: i + 1, name: `${firstNames[i]!} ${lastNames[i]!}`,
  username: lastNames[i]!.toLowerCase(),
  email: emails[i]!,
  address: { street: `Street ${i + 1}`, suite: `Suite ${i + 1}`, city: `City ${i + 1}`, zipcode: `${10000 + i * 100}` },
  phone: `1-770-736-8031 x564${i}`, website: `${lastNames[i]!.toLowerCase()}.org`,
  company: { name: `Company ${i + 1}`, catchPhrase: `Catchphrase ${i + 1}`, bs: `BS ${i + 1}` },
}));

const albums: Album[] = Array.from({ length: 100 }, (_, i) => ({
  userId: (i % 10) + 1, id: i + 1, title: pick(titles, i * 2),
}));

const photos: Photo[] = Array.from({ length: 100 }, (_, i) => ({
  albumId: (i % 100) + 1, id: i + 1,
  title: pick(titles, i * 3),
  url: `https://via.placeholder.com/600/${100000 + i}`,
  thumbnailUrl: `https://via.placeholder.com/150/${100000 + i}`,
}));

export const data = { posts, comments, todos, users, albums, photos };
