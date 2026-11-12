from app.services.retrieval import search


def names(q, **kw):
    return [c["id"] for c, _, _ in search(q, **kw)]


def test_building_cooling_finds_termites_and_other_domains():
    r = names("buildings cooler electricity heat dissipation airflow insulation")
    assert "termite_mound" in r[:3]
    assert len({c["domain"] for c, _, _ in search("buildings cooler heat dissipation airflow insulation")}) >= 3


def test_traffic_finds_ant_colony():
    assert "ant_colony" in names("traffic congestion flow routing decentralized coordination")


def test_primary_discipline_is_excluded():
    assert "termite_mound" not in names("heat dissipation airflow ventilation cooling", exclude_domains=("Biology",))


def test_nonsense_and_single_word_matches_rejected():
    assert search("zzzz qqqq") == []
    assert search("banana") == []
