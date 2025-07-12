export const runtime = "nodejs";
import SearchPage from "@/components/search-page"


export default async function SearchPageEdge() {
    return (
        <SearchPage />
    )
}